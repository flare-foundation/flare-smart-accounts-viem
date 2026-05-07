import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { encodeFunctionData, parseEventLogs } from "viem";
import { Client, Wallet } from "xrpl";
import { abi as rouletteAbi } from "../abis/Roulette";
import { publicClient } from "../utils/client";
import { computeDirectMintingPaymentAmountXrp } from "../utils/fassets";
import { getPersonalAccountAddress, sendMemoFieldInstruction, type Call } from "../utils/smart-accounts";
import { rouletteAddress } from "./deploys";
import { formatFxrp, readChips, type RouletteContext } from "./utils";

// BetKind enum order in Roulette.sol: STRAIGHT, RED, BLACK, ODD, EVEN, LOW, HIGH
const BetKind = {
  STRAIGHT: 0,
  RED: 1,
  BLACK: 2,
  ODD: 3,
  EVEN: 4,
  LOW: 5,
  HIGH: 6,
} as const;

type BetKindValue = (typeof BetKind)[keyof typeof BetKind];

async function placeBet({
  ctx,
  bet,
  betAmount,
}: {
  ctx: RouletteContext;
  bet: { kind: BetKindValue; selection: number };
  betAmount: bigint;
}): Promise<{ betId: bigint; placedAt: bigint }> {
  const calls: Call[] = [
    {
      target: rouletteAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: rouletteAbi,
        functionName: "placeBet",
        args: [bet.kind, bet.selection, betAmount],
      }),
    },
  ];
  const event = await sendMemoFieldInstruction({
    label: "place-bet",
    calls,
    amountXrp: ctx.memoOnlyAmountXrp,
    personalAccount: ctx.personalAccount,
    xrplClient: ctx.xrplClient,
    xrplWallet: ctx.xrplWallet,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: event.transactionHash! });
  const logs = parseEventLogs({ abi: rouletteAbi, eventName: "BetPlaced", logs: receipt.logs });
  const placed = logs.find((log) => log.args.player.toLowerCase() === ctx.personalAccount.toLowerCase());
  if (!placed) {
    throw new Error("BetPlaced event not found for our personal account");
  }
  const betId = placed.args.betId;

  // Tuple order matches the `bets` getter outputs:
  // (player, kind, selection, amount, placedAt, settled).
  const [, , , , placedAt] = await publicClient.readContract({
    address: rouletteAddress,
    abi: rouletteAbi,
    functionName: "bets",
    args: [betId],
  });
  console.log("Bet placed — betId:", betId.toString(), "placedAt:", placedAt.toString(), "\n");
  return { betId, placedAt };
}

async function waitForNextSecureRandom(placedAt: bigint) {
  const generatorAddress = await publicClient.readContract({
    address: rouletteAddress,
    abi: rouletteAbi,
    functionName: "generator",
  });

  console.log("Polling for next secure random round…");
  while (true) {
    const [, isSecureRandom, randomTimestamp] = await publicClient.readContract({
      address: generatorAddress,
      abi: coston2.randomNumberV2InterfaceAbi,
      functionName: "getRandomNumber",
    });
    if (isSecureRandom && randomTimestamp > placedAt) {
      console.log("Random ready — randomTimestamp:", randomTimestamp.toString(), "\n");
      return;
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
}

async function settleBet({ ctx, betId }: { ctx: RouletteContext; betId: bigint }) {
  const calls: Call[] = [
    {
      target: rouletteAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: rouletteAbi,
        functionName: "settleBet",
        args: [betId],
      }),
    },
  ];
  const event = await sendMemoFieldInstruction({
    label: "settle-bet",
    calls,
    amountXrp: ctx.memoOnlyAmountXrp,
    personalAccount: ctx.personalAccount,
    xrplClient: ctx.xrplClient,
    xrplWallet: ctx.xrplWallet,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: event.transactionHash! });
  const logs = parseEventLogs({ abi: rouletteAbi, eventName: "BetSettled", logs: receipt.logs });
  const settled = logs.find((log) => log.args.betId === betId);
  if (!settled) {
    throw new Error("BetSettled event not found for this betId");
  }
  console.log(
    "Settled — wheel:",
    settled.args.wheel,
    "won:",
    settled.args.won,
    "payout:",
    formatFxrp(settled.args.payout),
    "FXRP\n"
  );
  return settled.args;
}

// NOTE:(Nik) Run src/roulette/fund-game.ts first to mint FXRP and buy chips
// for the personal account. The contract owner must also have called
// `fundHouse` with enough FXRP to cover `betAmount * 35` (the worst-case
// straight-up payout) — even outside-bet plays are gated on the same
// solvency check via `outstandingMaxLoss`. Run src/roulette/cash-out.ts
// afterwards to convert remaining chips back to FXRP. The Roulette address
// is read from ./deploys.ts.
async function main() {
  const betAmount = 1n * 10n ** 6n;
  const bet = { kind: BetKind.BLACK, selection: 0 };

  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const [personalAccount, memoOnlyAmountXrp] = await Promise.all([
    getPersonalAccountAddress(xrplWallet.address),
    computeDirectMintingPaymentAmountXrp({ netMintAmountXrp: 0 }),
  ]);
  console.log("Personal account address:", personalAccount, "\n");
  console.log("Memo-only amount (XRP, fees only):", memoOnlyAmountXrp, "\n");

  const ctx: RouletteContext = { personalAccount, memoOnlyAmountXrp, xrplClient, xrplWallet };

  const chipsBefore = await readChips(personalAccount);
  console.log("Chips before:", formatFxrp(chipsBefore), "FXRP\n");

  const { betId, placedAt } = await placeBet({ ctx, bet, betAmount });
  await waitForNextSecureRandom(placedAt);
  await settleBet({ ctx, betId });

  const chipsAfter = await readChips(personalAccount);
  console.log("Chips after:", formatFxrp(chipsAfter), "FXRP\n");
  console.log("P&L:", formatFxrp(chipsAfter - chipsBefore), "FXRP\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

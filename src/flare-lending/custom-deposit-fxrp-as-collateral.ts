import { encodeFunctionData, toHex } from "viem";
import type { Log } from "viem";
import { Client, Wallet } from "xrpl";
import { MPT_ISSUANCE_ID } from "./config";
import { abi } from "../abis/CustomInstructionsFacet";
import { abi as BridgeAbi } from "../abis/DummyBridge";
import { abi as LendingAbi } from "../abis/DummyLending";
import { abi as ERC20Abi } from "../abis/ERC20";
import { abi as iInstructionsFacetAbi } from "../abis/IInstructionsFacet";
import { publicClient } from "../utils/client";
import type { CustomInstructionExecutedEventType } from "../utils/event-types";
import {
  getInstructionFee,
  getOperatorXrplAddresses,
  getPersonalAccountAddress,
  MASTER_ACCOUNT_CONTROLLER_ADDRESS,
  registerCustomInstruction,
  type CustomInstruction,
} from "../utils/smart-accounts";
import { sendXrplPayment } from "../utils/xrpl";

async function encodeCustomInstruction(instructions: CustomInstruction[], walletId: number) {
  const encodedInstruction = (await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: abi,
    functionName: "encodeCustomInstruction",
    args: [instructions],
  })) as `0x${string}`;
  // NOTE:(Nik) We cut off the `0x` prefix and the first 2 bytes to get the length down to 30 bytes
  return ("0xff" + toHex(walletId, { size: 1 }).slice(2) + encodedInstruction.slice(6)) as `0x${string}`;
}

async function sendCustomInstruction({
  encodedInstruction,
  xrplClient,
  xrplWallet,
}: {
  encodedInstruction: `0x${string}`;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const operatorXrplAddress = (await getOperatorXrplAddresses())[0] as string;

  const instructionFee = await getInstructionFee(encodedInstruction);
  console.log("Instruction fee:", instructionFee, "\n");

  const customInstructionTransaction = await sendXrplPayment({
    destination: operatorXrplAddress,
    amount: instructionFee,
    memos: [{ Memo: { MemoData: encodedInstruction.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });

  return customInstructionTransaction;
}

async function waitForCustomInstructionExecutedEvent({
  encodedInstruction,
  personalAccountAddress,
}: {
  encodedInstruction: `0x${string}`;
  personalAccountAddress: string;
}) {
  let customInstructionExecutedEvent: CustomInstructionExecutedEventType | undefined;
  let customInstructionExecutedEventFound = false;

  const unwatchCustomInstructionExecuted = publicClient.watchContractEvent({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iInstructionsFacetAbi,
    eventName: "CustomInstructionExecuted",
    onLogs: (logs) => {
      for (const log of logs) {
        customInstructionExecutedEvent = log as CustomInstructionExecutedEventType;
        if (
          customInstructionExecutedEvent.args.callHash.slice(6) !== encodedInstruction.slice(6) ||
          customInstructionExecutedEvent.args.personalAccount.toLowerCase() !== personalAccountAddress.toLowerCase()
        ) {
          continue;
        }
        customInstructionExecutedEventFound = true;
        break;
      }
    },
  });

  console.log("Waiting for CustomInstructionExecuted event...");
  while (!customInstructionExecutedEventFound) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  unwatchCustomInstructionExecuted();

  return customInstructionExecutedEvent;
}

type InitiateBridgeEventArgs = { from?: string; to?: string; amount?: bigint };
type InitiateBridgeEventLog = Log & { args: InitiateBridgeEventArgs };

async function findLatestInitiateBridgeEventInLast30Blocks({
  bridgeAddress,
  personalAccountAddress,
}: {
  bridgeAddress: `0x${string}`;
  personalAccountAddress: string;
}): Promise<InitiateBridgeEventLog> {
  // RPC allows max 30 blocks per eth_getLogs; range is inclusive so we use at most 30 blocks
  const RPC_MAX_BLOCK_RANGE = 30n;
  const toBlock = await publicClient.getBlockNumber();
  const fromBlock = toBlock >= RPC_MAX_BLOCK_RANGE ? toBlock - RPC_MAX_BLOCK_RANGE + 1n : 0n;

  const logs = await publicClient.getContractEvents({
    address: bridgeAddress,
    abi: BridgeAbi,
    eventName: "InitiateBridge",
    fromBlock,
    toBlock,
  });

  const matchingEvents = (logs as InitiateBridgeEventLog[]).filter(
    (log) => log.args.from?.toLowerCase() === personalAccountAddress.toLowerCase()
  );
  if (matchingEvents.length === 0) {
    throw new Error(
      `No InitiateBridge event with from=${personalAccountAddress} in the last ${RPC_MAX_BLOCK_RANGE} blocks (${fromBlock}-${toBlock})`
    );
  }

  const latest = matchingEvents.sort((a, b) => {
    const aBlock = a.blockNumber ?? 0n;
    const bBlock = b.blockNumber ?? 0n;
    if (bBlock !== aBlock) return Number(bBlock - aBlock);
    return (b.transactionIndex ?? 0) - (a.transactionIndex ?? 0);
  })[0]!;

  return latest;
}

/**
 * Transfers the InitiateBridge event amount of MPT on XRPL from the VAULT_SEED account
 * to the XRPL address in the event's `to` field.
 * The event amount is multiplied by 10^assetScale for the MPT value.
 * The recipient (recipientXrplWallet) is authorized to receive the MPT (MPTokenAuthorize)
 * before sending, if not already authorized.
 */
async function transferEventAmountMptToXrplAddress({
  initiateBridgeEvent,
  xrplClient,
  vaultSeed,
  mptIssuanceId,
  assetScale,
  recipientXrplWallet,
}: {
  initiateBridgeEvent: InitiateBridgeEventLog;
  xrplClient: Client;
  vaultSeed: string;
  mptIssuanceId: string;
  assetScale: number;
  recipientXrplWallet: Wallet;
}): Promise<void> {
  const toXrplAddress = initiateBridgeEvent.args.to;
  const amount = initiateBridgeEvent.args.amount;
  if (!toXrplAddress || amount === undefined) {
    throw new Error("InitiateBridge event missing to or amount");
  }

  const valueScaled = amount * 10n ** BigInt(assetScale);
  const vaultWallet = Wallet.fromSeed(vaultSeed);

  await xrplClient.connect();

  try {
    const accountObjectsResponse = await xrplClient.request({
      command: "account_objects",
      account: recipientXrplWallet.address,
      type: "mptoken",
      ledger_index: "validated",
    });
    const mptObjects = (accountObjectsResponse.result.account_objects ?? []) as Array<{
      LedgerEntryType?: string;
      MPTokenIssuanceID?: string;
    }>;
    const alreadyAuthorized = mptObjects.some(
      (obj) => obj.LedgerEntryType === "MPToken" && obj.MPTokenIssuanceID === mptIssuanceId
    );

    if (!alreadyAuthorized) {
      const authTransactionData = {
        TransactionType: "MPTokenAuthorize" as const,
        Account: recipientXrplWallet.address,
        MPTokenIssuanceID: mptIssuanceId,
      };
      const authPrepared = await xrplClient.autofill(authTransactionData);
      const authSigned = recipientXrplWallet.sign(authPrepared);
      const authResult = await xrplClient.submitAndWait(authSigned.tx_blob);
      const authMeta = authResult.result.meta as { TransactionResult?: string } | string;
      const authCode = typeof authMeta === "string" ? authMeta : authMeta.TransactionResult;

      if (authCode !== "tesSUCCESS") {
        throw new Error(`MPTokenAuthorize failed: ${authCode}`);
      } else {
        console.log("Recipient authorized for MPT.");
      }
    } else {
      console.log("Recipient already authorized for MPT, skipping MPTokenAuthorize.");
    }

    const paymentTransactionData = {
      TransactionType: "Payment" as const,
      Account: vaultWallet.address,
      Destination: toXrplAddress,
      Amount: {
        mpt_issuance_id: mptIssuanceId,
        value: valueScaled.toString(),
      },
    };
    const paymentTransactionPrepared = await xrplClient.autofill(paymentTransactionData);
    const paymentTransactionSigned = vaultWallet.sign(paymentTransactionPrepared);
    const paymentResult = await xrplClient.submitAndWait(paymentTransactionSigned.tx_blob);
    const paymentMeta = paymentResult.result.meta as { TransactionResult?: string } | string;
    const paymentResultCode = typeof paymentMeta === "string" ? paymentMeta : paymentMeta.TransactionResult;
    if (paymentResultCode !== "tesSUCCESS") {
      throw new Error(`MPT Payment failed: ${paymentResultCode}`);
    }
    console.log(
      `Transferred ${valueScaled.toString()} MPT (${amount.toString()} × 10^${assetScale}) to ${toXrplAddress}. Tx hash: ${paymentResult.result.hash}`,
      "\n"
    );
  } finally {
    await xrplClient.disconnect();
  }
}

// NOTE:(Nik) For this example to work, you first need to faucet C2FLR to your personal account address.
async function main() {
  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const walletId = 0;

  const loanContractAddress = "0xa5B3E70376B6CdbBfD33bd2af656f3Fada8f017f";
  const dummyUSDTAddress = "0x8A6a67b3edf7A876E107090485681ec71cAdf3bA";
  const bridgeAddress = "0x620864B25471EFEbBd27bFc3239AEB1888fc35b9";

  const FXRPAddress = "0x0b6A3645c240605887a5532109323A3E12273dc7";

  const amountToDeposit = 100; // In wei
  const amountToBorrow = 10; // In wei

  // NOTE:(Filip) Allow + call deposit + take Loan + approve bridge + withdraw from bridge
  const allowInstructionFXRP = {
    targetContract: FXRPAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: ERC20Abi,
      functionName: "approve",
      args: [loanContractAddress, amountToDeposit],
    }),
  };

  const depositCollateral = {
    targetContract: loanContractAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: LendingAbi,
      functionName: "depositCollateral",
      args: [amountToDeposit],
    }),
  };

  const takeLoanInstruction = {
    targetContract: loanContractAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: LendingAbi,
      functionName: "takeLoan",
      args: [amountToBorrow],
    }),
  };

  const allowInstructionUSDT = {
    targetContract: dummyUSDTAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: ERC20Abi,
      functionName: "approve",
      args: [bridgeAddress, amountToBorrow],
    }),
  };

  const startBridgeInstruction = {
    targetContract: bridgeAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: BridgeAbi,
      functionName: "initiateBridge",
      args: [xrplWallet.address, amountToBorrow],
    }),
  };

  const customInstructions = [
    allowInstructionFXRP,
    depositCollateral,
    takeLoanInstruction,
    allowInstructionUSDT,
    startBridgeInstruction,
  ] as CustomInstruction[];
  console.log("Custom instructions:", customInstructions, "\n");

  const personalAccountAddress = await getPersonalAccountAddress(xrplWallet.address);
  console.log("Personal account address:", personalAccountAddress, "\n");

  const customInstructionCallHash = await registerCustomInstruction(customInstructions);
  console.log("Custom instruction call hash:", customInstructionCallHash, "\n");
  const encodedInstruction = await encodeCustomInstruction(customInstructions, walletId);
  console.log("Encoded instructions:", encodedInstruction, "\n");

  const customInstructionTransaction = await sendCustomInstruction({
    encodedInstruction,
    xrplClient,
    xrplWallet,
  });
  console.log("Custom instruction transaction hash:", customInstructionTransaction.result.hash, "\n");

  const customInstructionExecutedEvent = await waitForCustomInstructionExecutedEvent({
    encodedInstruction,
    personalAccountAddress,
  });
  console.log("CustomInstructionExecuted event:", customInstructionExecutedEvent, "\n");

  const initiateBridgeEvent = await findLatestInitiateBridgeEventInLast30Blocks({
    bridgeAddress: bridgeAddress as `0x${string}`,
    personalAccountAddress,
  });
  console.log("InitiateBridge event:", initiateBridgeEvent, "\n");

  await transferEventAmountMptToXrplAddress({
    initiateBridgeEvent,
    xrplClient,
    vaultSeed: process.env.VAULT_SEED!,
    mptIssuanceId: MPT_ISSUANCE_ID,
    assetScale: 6,
    recipientXrplWallet: xrplWallet,
  });
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

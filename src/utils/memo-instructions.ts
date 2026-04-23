import { concatHex, encodeAbiParameters, encodeFunctionData, toHex, type Address } from "viem";
import { Client, Wallet } from "xrpl";
import { publicClient } from "./client";
import { sendXrplPayment } from "./xrpl";
import { getMasterAccountControllerAddress } from "./smart-accounts";
import { getContractAddressByName } from "./flare-contract-registry";
import { getDirectMintingPaymentAddress } from "./direct-minting";
import { abi as iMemoInstructionsFacetAbi } from "../abis/IMemoInstructionsFacet";
import { abi as iPersonalAccountAbi } from "../abis/IPersonalAccount";
import type { Call } from "./smart-accounts";
import type { UserOperationExecutedEventType } from "./event-types";

const ZERO_BYTES32 = ("0x" + "00".repeat(32)) as `0x${string}`;

const PACKED_USER_OPERATION_TUPLE = {
  type: "tuple",
  components: [
    { name: "sender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "initCode", type: "bytes" },
    { name: "callData", type: "bytes" },
    { name: "accountGasLimits", type: "bytes32" },
    { name: "preVerificationGas", type: "uint256" },
    { name: "gasFees", type: "bytes32" },
    { name: "paymasterAndData", type: "bytes" },
    { name: "signature", type: "bytes" },
  ],
} as const;

export async function getNonce(personalAccount: Address): Promise<bigint> {
  return publicClient.readContract({
    address: await getMasterAccountControllerAddress(),
    abi: iMemoInstructionsFacetAbi,
    functionName: "getNonce",
    args: [personalAccount],
  }) as Promise<bigint>;
}

export function encodeExecuteUserOpMemo({
  calls,
  walletId,
  executorFeeUBA,
  sender,
  nonce,
}: {
  calls: Call[];
  walletId: number;
  executorFeeUBA: bigint;
  sender: Address;
  nonce: bigint;
}): `0x${string}` {
  const callData = encodeFunctionData({
    abi: iPersonalAccountAbi,
    functionName: "executeUserOp",
    args: [calls],
  });

  const encodedUserOp = encodeAbiParameters(
    [PACKED_USER_OPERATION_TUPLE],
    [
      {
        sender,
        nonce,
        initCode: "0x",
        callData,
        accountGasLimits: ZERO_BYTES32,
        preVerificationGas: 0n,
        gasFees: ZERO_BYTES32,
        paymasterAndData: "0x",
        signature: "0x",
      },
    ],
  );

  // 10-byte header: 0xFF | walletId (1B) | executorFee (8B, big-endian)
  const header = concatHex([
    "0xff",
    toHex(walletId, { size: 1 }),
    toHex(executorFeeUBA, { size: 8 }),
  ]);

  return concatHex([header, encodedUserOp]);
}

export async function sendMemoInstruction({
  memoData,
  amountXrp,
  xrplClient,
  xrplWallet,
}: {
  memoData: `0x${string}`;
  amountXrp: number;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const assetManagerAddress = await getContractAddressByName("AssetManagerFXRP");
  const coreVaultXrplAddress = await getDirectMintingPaymentAddress(assetManagerAddress);

  return sendXrplPayment({
    destination: coreVaultXrplAddress,
    amount: amountXrp,
    memos: [{ Memo: { MemoData: memoData.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
}

// The XRPL payment that carries this memo also direct-mints FXRP to the personal
// account (minus the executor fee in UBA). This amount must cover the mint value.
// If the memo instruction reverts (e.g. nonce mismatch), the whole mintedFAssets
// call reverts — the XRPL payment is consumed but no FAssets are minted. Recovery
// is via the 0xE0 ignore-memo instruction on a subsequent payment.
export const DIRECT_MINT_AMOUNT_XRP = 10;
// Amount used for subsequent batches that don't need more FXRP but still have to
// travel through the direct-minting flow. Keep it just above the minimum mint +
// executor fee. Tune down if your deployment allows a smaller floor.
export const MEMO_ONLY_AMOUNT_XRP = 1;

export async function sendBatch({
  label,
  calls,
  amountXrp,
  personalAccount,
  xrplClient,
  xrplWallet,
}: {
  label: string;
  calls: Call[];
  amountXrp: number;
  personalAccount: Address;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  console.log(`[${label}] calls:`, calls, "\n");

  const nonce = await getNonce(personalAccount);
  console.log(`[${label}] current nonce:`, nonce, "\n");

  const memoData = encodeExecuteUserOpMemo({
    calls,
    walletId: 0,
    executorFeeUBA: 0n,
    sender: personalAccount,
    nonce,
  });

  const transaction = await sendMemoInstruction({
    memoData,
    amountXrp,
    xrplClient,
    xrplWallet,
  });
  console.log(`[${label}] XRPL transaction hash:`, transaction.result.hash, "\n");

  const event = await waitForUserOperationExecuted({ personalAccount, nonce });
  console.log(`[${label}] UserOperationExecuted event:`, event, "\n");
}

export async function waitForUserOperationExecuted({
  personalAccount,
  nonce,
}: {
  personalAccount: Address;
  nonce: bigint;
}): Promise<UserOperationExecutedEventType> {
  const masterAccountControllerAddress = await getMasterAccountControllerAddress();

  return new Promise((resolve) => {
    const unwatch = publicClient.watchContractEvent({
      address: masterAccountControllerAddress,
      abi: iMemoInstructionsFacetAbi,
      eventName: "UserOperationExecuted",
      onLogs: (logs) => {
        for (const log of logs) {
          const typedLog = log as UserOperationExecutedEventType;
          if (
            typedLog.args.personalAccount.toLowerCase() !== personalAccount.toLowerCase() ||
            typedLog.args.nonce !== nonce
          ) {
            continue;
          }
          unwatch();
          resolve(typedLog);
          return;
        }
      },
    });
  });
}

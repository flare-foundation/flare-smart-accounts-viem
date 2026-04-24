import { concatHex, encodeAbiParameters, encodeFunctionData, toHex, type Address } from "viem";
import { Client, Wallet } from "xrpl";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { publicClient } from "./client";
import { sendXrplPayment } from "./xrpl";
import {
  getContractAddressByName,
  getDirectMintingPaymentAddress,
  getMasterAccountControllerAddress,
} from "./flare-contract-registry";
import { abi as iMemoInstructionsFacetAbi } from "../abis/IMemoInstructionsFacet";
import { abi as iPersonalAccountAbi } from "../abis/IPersonalAccount";
import type { UserOperationExecutedEventType } from "./event-types";

export async function getOperatorXrplAddresses() {
  const result = await publicClient.readContract({
    address: await getMasterAccountControllerAddress(),
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getXrplProviderWallets",
    args: [],
  });
  return result as string[];
}

export async function getPersonalAccountAddress(xrplAddress: string) {
  const personalAccountAddress = await publicClient.readContract({
    address: await getMasterAccountControllerAddress(),
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getPersonalAccount",
    args: [xrplAddress],
  });

  return personalAccountAddress;
}


export async function getXrplAccountForAddress(evmAddress: Address): Promise<`0x${string}`> {
  const xrplOwner = await publicClient.readContract({
    address: evmAddress,
    abi: coston2.iPersonalAccountAbi,
    functionName: "xrplOwner",
    args: [],
  });
  return xrplOwner && xrplOwner.length > 0 ? evmAddress : "0x0000000000000000000000000000000000000000";
}

export async function isSmartAccount(evmAddress: Address): Promise<boolean> {
  const smartAccountAddress = await getXrplAccountForAddress(evmAddress);
  return smartAccountAddress !== "0x0000000000000000000000000000000000000000";
}

export type Vault = {
  id: bigint;
  address: Address;
  type: number;
};

export type GetVaultsReturnType = [bigint[], string[], number[]];

export async function getVaults(): Promise<Vault[]> {
  const _vaults = (await publicClient.readContract({
    address: await getMasterAccountControllerAddress(),
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getVaults",
    args: [],
  })) as GetVaultsReturnType;

  const length = _vaults[0].length;
  if (length === 0) {
    return [];
  }

  const vaults = new Array(length) as Vault[];

  _vaults[0].forEach((id, index) => {
    vaults[index] = {
      id,
      address: _vaults[1][index]! as Address,
      type: _vaults[2][index]!,
    };
  });

  return vaults;
}

export type AgentVault = {
  id: bigint;
  address: Address;
};

export type GetAgentVaultsReturnType = [bigint[], string[]];

export async function getAgentVaults(): Promise<AgentVault[]> {
  const _vaults = await publicClient.readContract({
    address: await getMasterAccountControllerAddress(),
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getAgentVaults",
    args: [],
  });

  const length = _vaults[0].length;
  if (length === 0) {
    return [];
  }

  const vaults = new Array(length) as AgentVault[];

  _vaults[0].forEach((id, index) => {
    vaults[index] = {
      id,
      address: _vaults[1][index]!,
    };
  });

  return vaults;
}

export type Call = {
  target: Address;
  value: bigint;
  data: `0x${string}`;
};

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

export async function sendMemoFieldInstruction({
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

  const assetManagerAddress = await getContractAddressByName("AssetManagerFXRP");
  const coreVaultXrplAddress = await getDirectMintingPaymentAddress(assetManagerAddress);

  const transaction = await sendXrplPayment({
    destination: coreVaultXrplAddress,
    amount: amountXrp,
    memos: [{ Memo: { MemoData: memoData.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
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

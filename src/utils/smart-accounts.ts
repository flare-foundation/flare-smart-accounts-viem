import { fromHex, toHex, type Address, type Log } from "viem";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { account, publicClient, walletClient } from "./client";

import { getContractAddressByName } from "./flare-contract-registry";
import { dropsToXrp, type Client, type Wallet } from "xrpl";
import { abi as iInstructionsFacetAbi } from "../abis/IInstructionsFacet";
import { abi as iCustomInstructionsFacetAbi } from "../abis/ICustomInstructionsFacet";
import { sendXrplPayment } from "./xrpl";

export async function getMasterAccountControllerAddress(): Promise<Address> {
  return getContractAddressByName("MasterAccountController");
}

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

export async function getInstructionFee(encodedInstruction: string) {
  const instructionId = encodedInstruction.slice(0, 4);
  const instructionIdDecimal = fromHex(instructionId as `0x${string}`, "bigint");

  console.log("instructionIdDecimal:", instructionIdDecimal, "\n");

  const requestFee = await publicClient.readContract({
    address: await getMasterAccountControllerAddress(),
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getInstructionFee",
    args: [instructionIdDecimal],
  });
  return dropsToXrp(Number(requestFee));
}

export type CustomInstruction = {
  targetContract: Address;
  value: bigint;
  data: `0x${string}`;
};

export async function registerCustomInstruction(instructions: CustomInstruction[]): Promise<`0x${string}`> {
  const { request } = await publicClient.simulateContract({
    account: account,
    address: await getMasterAccountControllerAddress(),
    abi: iCustomInstructionsFacetAbi,
    functionName: "registerCustomInstruction",
    args: [instructions],
  });
  console.log("request:", request, "\n");

  const registerCustomInstructionTransaction = await walletClient.writeContract(request);
  console.log("Register custom instruction transaction:", registerCustomInstructionTransaction, "\n");

  return registerCustomInstructionTransaction;
}

export async function encodeCustomInstruction(instructions: CustomInstruction[], walletId: number) {
  const encodedInstruction = (await publicClient.readContract({
    address: await getMasterAccountControllerAddress(),
    abi: iCustomInstructionsFacetAbi,
    functionName: "encodeCustomInstruction",
    args: [instructions],
  })) as `0x${string}`;
  // NOTE:(Nik) We cut off the `0x` prefix and the first 2 bytes to get the length down to 30 bytes
  return ("0xff" + toHex(walletId, { size: 1 }).slice(2) + encodedInstruction.slice(6)) as `0x${string}`;
}

export async function sendCustomInstruction({
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

type CustomInstructionExecutedArgsType = {
  args: {
    personalAccount: Address;
    callHash: `0x${string}`;
    customInstruction: Array<CustomInstruction>;
  };
};
type CustomInstructionExecutedEventType = Log & CustomInstructionExecutedArgsType;

export async function waitForCustomInstructionExecutedEvent({
  encodedInstruction,
  personalAccountAddress,
}: {
  encodedInstruction: `0x${string}`;
  personalAccountAddress: string;
}) {
  let customInstructionExecutedEvent: CustomInstructionExecutedEventType | undefined;
  let customInstructionExecutedEventFound = false;

  const unwatchCustomInstructionExecuted = publicClient.watchContractEvent({
    address: await getMasterAccountControllerAddress(),
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

import { ContractFunctionExecutionError, type Address } from "viem";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { account, publicClient, walletClient } from "./client";
import { dropsToXrp } from "xrpl";
import { abi } from "../abis/CustomInstructionsFacet";

export const MASTER_ACCOUNT_CONTROLLER_ADDRESS = "0x434936d47503353f06750Db1A444DBDC5F0AD37c";

export async function getOperatorXrplAddresses() {
  const result = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getXrplProviderWallets",
    args: [],
  });
  return result as string[];
}

export async function getPersonalAccountAddress(xrplAddress: string) {
  const personalAccountAddress = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
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
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
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
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
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
  const requestFee = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: coston2.iMasterAccountControllerAbi,
    functionName: "getInstructionFee",
    args: [BigInt(encodedInstruction.slice(0, 2))],
  });
  return dropsToXrp(Number(requestFee));
}

export type CustomInstruction = {
  targetContract: Address;
  value: bigint;
  data: `0x${string}`;
};

export async function registerCustomInstruction(instructions: CustomInstruction[]): Promise<`0x${string}`> {
  try {
    const encodeCustomInstructionResult = (await publicClient.readContract({
      address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
      abi: abi,
      functionName: "encodeCustomInstruction",
      args: [instructions],
    })) as `0x${string}`;
    console.log("result:", encodeCustomInstructionResult, "\n");

    await publicClient.readContract({
      address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
      abi: abi,
      functionName: "getCustomInstruction",
      args: [encodeCustomInstructionResult],
    });

    return encodeCustomInstructionResult;
  } catch (error) {
    console.log((error as ContractFunctionExecutionError).message);
  }

  const { request } = await publicClient.simulateContract({
    account: account,
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: abi,
    functionName: "registerCustomInstruction",
    args: [instructions],
  });
  console.log("request:", request, "\n");

  const registerCustomInstructionResult = await walletClient.writeContract(request);
  console.log("registerCustomInstructionResult:", registerCustomInstructionResult, "\n");

  return registerCustomInstructionResult;
}

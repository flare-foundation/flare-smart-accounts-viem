import type { Address } from "viem";
import { abi as iMasterAccountControllerAbi } from "../abis/IMasterAccountController";
import { publicClient } from "./client";
import { dropsToXrp } from "xrpl";

export const MASTER_ACCOUNT_CONTROLLER_ADDRESS = "0x3ab31E2d943d1E8F47B275605E50Ff107f2F8393";

export async function getOperatorXrplAddress() {
  const operatorXrplAddress = (await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iMasterAccountControllerAbi,
    functionName: "getXrplProviderWallets",
    args: [],
  })) as string[];

  // WARN:(Nik) Here we assume that there is only one provider wallet available.
  return operatorXrplAddress[0] as string;
}

export async function getPersonalAccountAddress(xrplAddress: string) {
  const personalAccountAddress = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iMasterAccountControllerAbi,
    functionName: "getPersonalAccount",
    args: [xrplAddress],
  });

  return personalAccountAddress as Address;
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
    abi: iMasterAccountControllerAbi,
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
  const _vaults = (await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iMasterAccountControllerAbi,
    functionName: "getAgentVaults",
    args: [],
  })) as GetVaultsReturnType;

  const length = _vaults[0].length;
  if (length === 0) {
    return [];
  }

  const vaults = new Array(length) as AgentVault[];

  _vaults[0].forEach((id, index) => {
    vaults[index] = {
      id,
      address: _vaults[1][index]! as Address,
    };
  });

  return vaults;
}

export async function getInstructionFee(encodedInstruction: string) {
  const requestFee = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iMasterAccountControllerAbi,
    functionName: "getInstructionFee",
    args: [encodedInstruction.slice(0, 2)],
  });
  return dropsToXrp(Number(requestFee));
}

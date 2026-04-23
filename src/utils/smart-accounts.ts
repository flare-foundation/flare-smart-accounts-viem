import type { Address } from "viem";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { publicClient } from "./client";
import { getContractAddressByName } from "./flare-contract-registry";

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

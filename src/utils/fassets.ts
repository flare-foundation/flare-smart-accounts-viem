import { type Address, erc20Abi } from "viem";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { publicClient } from "./client";
import { getContractAddressByName } from "./flare-contract-registry";

export async function getAssetManagerFXRPAddress(): Promise<Address> {
  const assetManagerAddress = await getContractAddressByName("AssetManagerFXRP");
  return assetManagerAddress;
}

export async function getFxrpAddress(): Promise<Address> {
  const assetManagerAddress = await getAssetManagerFXRPAddress();
  const fxrpAddress = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: "fAsset",
  });
  return fxrpAddress;
}

export async function getFxrpBalance(address: Address) {
  const fxrpAddress = await getFxrpAddress();
  const fxrpBalance = await publicClient.readContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
  return fxrpBalance;
}

export async function getFxrpDecimals() {
  const fxrpAddress = await getFxrpAddress();
  const decimals = await publicClient.readContract({
    address: fxrpAddress,
    abi: erc20Abi,
    functionName: "decimals",
    args: [],
  });
  return decimals;
}

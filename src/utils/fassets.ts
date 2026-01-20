import type { Address } from "viem";
import { abi } from "../abis/FAsset";
import { publicClient } from "./client";

export const FXRP_ADDRESS = "0x0b6A3645c240605887a5532109323A3E12273dc7";

export async function getFxrpBalance(address: Address) {
  const fxrpBalance = await publicClient.readContract({
    address: FXRP_ADDRESS,
    abi: abi,
    functionName: "balanceOf",
    args: [address],
  });
  return fxrpBalance;
}

export async function getFxrpDecimals() {
  const decimals = await publicClient.readContract({
    address: FXRP_ADDRESS,
    abi: abi,
    functionName: "decimals",
    args: [],
  });
  return decimals;
}

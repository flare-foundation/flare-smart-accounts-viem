import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import type { Address } from "viem";
import { publicClient } from "../utils/client";

export function getAssetMintingGranularityUBA(assetManagerAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: "assetMintingGranularityUBA",
  });
}

export function getDirectMintingHourlyLimitUBA(assetManagerAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getDirectMintingHourlyLimitUBA",
  });
}

export function getDirectMintingDailyLimitUBA(assetManagerAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getDirectMintingDailyLimitUBA",
  });
}

export function getDirectMintingHourlyLimiterState(assetManagerAddress: Address): Promise<readonly [bigint, bigint]> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getDirectMintingHourlyLimiterState",
  });
}

export function getDirectMintingDailyLimiterState(assetManagerAddress: Address): Promise<readonly [bigint, bigint]> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getDirectMintingDailyLimiterState",
  });
}

export function getDirectMintingsUnblockUntilTimestamp(assetManagerAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getDirectMintingsUnblockUntilTimestamp",
  });
}

export function getDirectMintingLargeMintingThresholdUBA(assetManagerAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getDirectMintingLargeMintingThresholdUBA",
  });
}

export function getDirectMintingLargeMintingDelaySeconds(assetManagerAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getDirectMintingLargeMintingDelaySeconds",
  });
}

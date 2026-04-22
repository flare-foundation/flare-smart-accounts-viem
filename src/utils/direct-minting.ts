import type { Address } from "viem";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { publicClient } from "./client";
import type { DirectMintingExecutedEventType } from "./event-types";

export async function getDirectMintingPaymentAddress(
  assetManagerAddress: Address,
): Promise<string> {
  return (await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingAbi,
    functionName: "directMintingPaymentAddress",
  }));
}

export async function getMintingTagManagerAddress(
  assetManagerAddress: Address,
): Promise<Address> {
  return (await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getMintingTagManager",
  }));
}

export function waitForDirectMintingExecuted({
  assetManagerAddress,
  targetAddress,
}: {
  assetManagerAddress: Address;
  targetAddress: Address;
}): Promise<DirectMintingExecutedEventType> {
  return new Promise((resolve) => {
    const unwatch = publicClient.watchContractEvent({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingAbi,
      eventName: "DirectMintingExecuted",
      onLogs: (logs) => {
        for (const log of logs) {
          const typedLog = log as DirectMintingExecutedEventType;
          if (typedLog.args.targetAddress.toLowerCase() !== targetAddress.toLowerCase()) {
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

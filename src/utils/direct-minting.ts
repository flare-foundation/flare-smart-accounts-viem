import type { Address } from "viem";
import { publicClient } from "./client";
import { abi as iDirectMintingAbi } from "../abis/IDirectMinting";
import type { DirectMintingExecutedEventType } from "./event-types";

export async function getDirectMintingPaymentAddress(
  assetManagerAddress: Address,
): Promise<string> {
  const paymentAddress = await publicClient.readContract({
    address: assetManagerAddress,
    abi: iDirectMintingAbi,
    functionName: "directMintingPaymentAddress",
  });

  return paymentAddress;
}

export async function getMintingTagManagerAddress(
  assetManagerAddress: Address,
): Promise<Address> {
  return publicClient.readContract({
    address: assetManagerAddress,
    abi: iDirectMintingAbi,
    functionName: "getMintingTagManager",
  });
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
      abi: iDirectMintingAbi,
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

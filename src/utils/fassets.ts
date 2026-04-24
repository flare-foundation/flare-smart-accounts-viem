import { type Address, erc20Abi } from "viem";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { dropsToXrp, xrpToDrops } from "xrpl";
import { publicClient } from "./client";
import {
  getAssetManagerFXRPAddress,
  getContractAddressByName,
  getFxrpAddress,
} from "./flare-contract-registry";
import type { DirectMintingExecutedEventType } from "./event-types";

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

export async function calculateAmountToSend(lots: bigint): Promise<bigint> {
  const assetManagerAddress = await getAssetManagerFXRPAddress();
  const settings = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: "getSettings",
  });
  return lots * BigInt(settings.lotSizeAMG) * BigInt(settings.assetMintingGranularityUBA);
}

export async function computeDirectMintingPaymentAmountXrp({
  netMintAmountXrp,
}: {
  netMintAmountXrp: number;
}): Promise<number> {
  const assetManagerAddress = await getContractAddressByName("AssetManagerFXRP");
  const [executorFeeUBA, feeBIPS, minimumFeeUBA] = await Promise.all([
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingExecutorFeeUBA",
    }),
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingFeeBIPS",
    }),
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingMinimumFeeUBA",
    }),
  ]);

  const netMintUBA = BigInt(xrpToDrops(netMintAmountXrp));
  const proportionalFeeUBA = (netMintUBA * feeBIPS) / 10_000n;
  const mintingFeeUBA = proportionalFeeUBA > minimumFeeUBA ? proportionalFeeUBA : minimumFeeUBA;
  const totalUBA = netMintUBA + mintingFeeUBA + executorFeeUBA;

  return Number(dropsToXrp(totalUBA.toString()));
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

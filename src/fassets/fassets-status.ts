import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { isAddress, type Address } from "viem";
import { publicClient } from "../utils/client";
import { getContractAddressByName } from "../utils/flare-contract-registry";

const coreVaultManagerReadAbi = [
  {
    type: "function",
    name: "coreVaultAddress",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

async function main() {
  const assetManagerAddress = await getContractAddressByName("AssetManagerFXRP");
  console.log("AssetManagerFXRP address:", assetManagerAddress, "\n");

  const mintingTagManagerAddress = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iDirectMintingSettingsAbi,
    functionName: "getMintingTagManager",
  });
  console.log("MintingTagManager address:", mintingTagManagerAddress, "\n");

  const coreVaultManagerAddressResult = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: "getCoreVaultManager",
  });

  if (!isAddress(coreVaultManagerAddressResult)) {
    throw new Error("Invalid CoreVaultManager address returned from AssetManager");
  }

  const coreVaultManagerAddress: Address = coreVaultManagerAddressResult;

  const coreVaultXrplAddress = await publicClient.readContract({
    address: coreVaultManagerAddress,
    abi: coston2.iCoreVaultManagerAbi,
    functionName: "coreVaultAddress",
  });

  console.log("Core Vault XRPL address:", coreVaultXrplAddress, "\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

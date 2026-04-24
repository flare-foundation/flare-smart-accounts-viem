import type { Address } from "viem";
import { publicClient } from "./utils/client";
import { getContractAddressByName, getMintingTagManagerAddress } from "./utils/flare-contract-registry";
import { abi as iMintingTagManagerAbi } from "./abis/IMintingTagManager";

const TAG: bigint = 42n;

async function main() {
  const assetManagerAddress = await getContractAddressByName("AssetManagerFXRP");
  const mintingTagManagerAddress = await getMintingTagManagerAddress(assetManagerAddress);
  console.log("MintingTagManager address:", mintingTagManagerAddress, "\n");

  const owner = (await publicClient.readContract({
    address: mintingTagManagerAddress,
    abi: iMintingTagManagerAbi,
    functionName: "ownerOf",
    args: [TAG],
  })) as Address;

  console.log("Owner of tag", TAG.toString() + ":", owner, "\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

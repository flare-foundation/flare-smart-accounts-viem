import { publicClient } from "./utils/client";
import { getMintingTagManagerAddress } from "./utils/smart-accounts";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";

const TAG: bigint = 42n;

async function main() {
  const mintingTagManagerAddress = await getMintingTagManagerAddress();
  console.log("MintingTagManager address:", mintingTagManagerAddress, "\n");

  const owner = await publicClient.readContract({
    address: mintingTagManagerAddress,
    abi: coston2.iMintingTagManagerAbi,
    functionName: "ownerOf",
    args: [TAG],
  });

  console.log("Owner of tag", TAG.toString() + ":", owner, "\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

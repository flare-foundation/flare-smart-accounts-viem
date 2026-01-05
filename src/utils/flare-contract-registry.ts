import { publicClient } from "./client";
import { coston2 } from "test-periphery-artifacts-wagmi-types";

const FLARE_CONTRACT_REGISTRY_ADDRESS = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

export async function getContractAddressByName(name: string) {
  const contractAddress = await publicClient.readContract({
    address: FLARE_CONTRACT_REGISTRY_ADDRESS,
    abi: coston2.iFlareContractRegistryAbi,
    functionName: "getContractAddressByName",
    args: [name],
  });

  return contractAddress;
}

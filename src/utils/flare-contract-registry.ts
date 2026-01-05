import type { Address } from "viem";
import { abi } from "../abis/IFlareContractRegistry";
import { publicClient } from "./client";

const FLARE_CONTRACT_REGISTRY_ADDRESS = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

export async function getContractAddressByName(name: string) {
  const contractAddress = await publicClient.readContract({
    address: FLARE_CONTRACT_REGISTRY_ADDRESS,
    abi: abi,
    functionName: "getContractAddressByName",
    args: [name],
  });

  return contractAddress as Address;
}

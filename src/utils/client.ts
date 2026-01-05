import { createPublicClient, http } from "viem";
import { flareTestnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: flareTestnet,
  transport: http(),
});

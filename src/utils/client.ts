import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { flareTestnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: flareTestnet,
  transport: http(),
});

export const walletClient = createWalletClient({
  chain: flareTestnet,
  transport: http(),
});

export const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

import { formatUnits, type Address } from "viem";
import { Client, Wallet } from "xrpl";
import { abi as rouletteAbi } from "../abis/Roulette";
import { publicClient } from "../utils/client";
import { rouletteAddress } from "./deploys";

// FXRP uses 6 decimals on Coston2, and Roulette chips track raw FXRP units
// 1:1, so the same formatter is correct for both balances.
export const FXRP_DECIMALS = 6;

export type RouletteContext = {
  personalAccount: Address;
  memoOnlyAmountXrp: number;
  xrplClient: Client;
  xrplWallet: Wallet;
};

export async function readChips(personalAccount: Address) {
  return publicClient.readContract({
    address: rouletteAddress,
    abi: rouletteAbi,
    functionName: "chips",
    args: [personalAccount],
  });
}

export function formatFxrp(amount: bigint): string {
  return formatUnits(amount, FXRP_DECIMALS);
}

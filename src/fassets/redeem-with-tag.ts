import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { parseEventLogs, type Address } from "viem";
import { account, publicClient, walletClient } from "../utils/client";
import { getContractAddressByName } from "../utils/flare-contract-registry";

// Amount to redeem in UBA.
const REDEEM_AMOUNT_UBA = 5000000n;
// Redeemer underlying (XRPL) address
const REDEEMER_UNDERLYING_ADDRESS_STRING = "rSHYuiEvsYsKR8uUHhBTuGP5zjRcGt4nm";
// Executor (not using, so using zero address)
const EXECUTOR_ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";
// XRPL destination tag registered for redemption (e.g. same as minting tag from MintingTagManager)
const REDEMPTION_DESTINATION_TAG = 72n;

async function main() {
  const assetManagerAddress = await getContractAddressByName("AssetManagerFXRP");
  console.log("AssetManagerFXRP address:", assetManagerAddress, "\n");

  const minimumRedeemAmountUBA = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: "minimumRedeemAmountUBA",
  });
  console.log("minimumRedeemAmountUBA:", minimumRedeemAmountUBA.toString(), "\n");
  console.log("Requested redeem amount UBA:", REDEEM_AMOUNT_UBA.toString(), "\n");
  console.log("Redemption destination tag:", REDEMPTION_DESTINATION_TAG.toString(), "\n");

  if (REDEEM_AMOUNT_UBA < minimumRedeemAmountUBA) {
    throw new Error(
      `Redeem amount (${REDEEM_AMOUNT_UBA.toString()}) must be greater than minimumRedeemAmountUBA (${minimumRedeemAmountUBA.toString()}).`
    );
  }

  const { request } = await publicClient.simulateContract({
    account,
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: "redeemWithTag",
    args: [
      REDEEM_AMOUNT_UBA,
      REDEEMER_UNDERLYING_ADDRESS_STRING,
      EXECUTOR_ZERO_ADDRESS,
      REDEMPTION_DESTINATION_TAG,
    ],
  });

  const txHash = await walletClient.writeContract(request);
  console.log("redeemWithTag tx hash:", txHash, "\n");

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("redeemWithTag status:", receipt.status, "\n");

  const redemptionLogs = parseEventLogs({
    abi: coston2.iAssetManagerAbi,
    eventName: "RedemptionWithTagRequested",
    logs: receipt.logs,
  });

  const redemptionEvent = redemptionLogs.find(
    (log) => log.args.redeemer.toLowerCase() === account.address.toLowerCase(),
  );

  if (!redemptionEvent) {
    throw new Error("RedemptionWithTagRequested event not found for this transaction and redeemer");
  }

  console.log("RedemptionWithTagRequested event:", redemptionEvent, "\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

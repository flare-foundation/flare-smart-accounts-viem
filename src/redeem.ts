import { encodeFunctionData, zeroAddress } from "viem";
import { Client, Wallet } from "xrpl";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { getPersonalAccountAddress, type Call } from "./utils/smart-accounts";
import {
  encodeExecuteUserOpMemo,
  getNonce,
  sendMemoInstruction,
  waitForUserOperationExecuted,
} from "./utils/memo-instructions";
import { getContractAddressByName } from "./utils/flare-contract-registry";

// The XRPL payment that carries this memo also direct-mints FXRP to the personal
// account. This amount must cover the mint value plus any executor fee.
const DIRECT_MINT_AMOUNT_XRP = 10;

const LOTS_TO_REDEEM = 1n;

async function main() {
  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const personalAccount = await getPersonalAccountAddress(xrplWallet.address);
  console.log("Personal account address:", personalAccount, "\n");

  const assetManagerFXRPAddress = await getContractAddressByName("AssetManagerFXRP");

  const calls: Call[] = [
    {
      target: assetManagerFXRPAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: coston2.iAssetManagerAbi,
        functionName: "redeem",
        args: [LOTS_TO_REDEEM, xrplWallet.address, zeroAddress],
      }),
    },
  ];
  console.log("Calls:", calls, "\n");

  const nonce = await getNonce(personalAccount);
  console.log("Current nonce:", nonce, "\n");

  const memoData = encodeExecuteUserOpMemo({
    calls,
    walletId: 0,
    executorFeeUBA: 0n,
    sender: personalAccount,
    nonce,
  });
  console.log("Memo data:", memoData, "\n");

  const transaction = await sendMemoInstruction({
    memoData,
    amountXrp: DIRECT_MINT_AMOUNT_XRP,
    xrplClient,
    xrplWallet,
  });
  console.log("XRPL transaction hash:", transaction.result.hash, "\n");

  const event = await waitForUserOperationExecuted({ personalAccount, nonce });
  console.log("UserOperationExecuted event:", event, "\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

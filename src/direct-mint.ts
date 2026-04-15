import { Client, Wallet } from "xrpl";
import type { Address } from "viem";
import { sendXrplPayment } from "./utils/xrpl";
import { getPersonalAccountAddress } from "./utils/smart-accounts";
import { getContractAddressByName } from "./utils/flare-contract-registry";
import { getFxrpBalance } from "./utils/fassets";
import { getDirectMintingPaymentAddress, waitForDirectMintingExecuted } from "./utils/direct-minting";

// Amount in XRP to send for direct minting (must cover minted value + minting fee + executor fee)
const DIRECT_MINT_AMOUNT_XRP = 10;

const DIRECT_MINTING_SMART_ACCOUNT_PREFIX = "4642505266410018";

function buildDirectMintingMemo(recipientAddress: Address): string {
  return DIRECT_MINTING_SMART_ACCOUNT_PREFIX + "00000000" + recipientAddress.slice(2).toLowerCase();
}

async function sendDirectMintPayment({
  coreVaultXrplAddress,
  recipientAddress,
  amountXrp,
  xrplClient,
  xrplWallet,
}: {
  coreVaultXrplAddress: string;
  recipientAddress: Address;
  amountXrp: number;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const memoData = buildDirectMintingMemo(recipientAddress);
  console.log("Direct minting memo (32 bytes):", memoData, "\n");

  const transaction = await sendXrplPayment({
    destination: coreVaultXrplAddress,
    amount: amountXrp,
    memos: [{ Memo: { MemoData: memoData } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log("Direct mint XRPL transaction hash:", transaction.result.hash, "\n");

  return transaction;
}

async function main() {
  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const [personalAccountAddress, assetManagerAddress] = await Promise.all([
    getPersonalAccountAddress(xrplWallet.address),
    getContractAddressByName("AssetManagerFXRP"),
  ]);
  console.log("Personal account address:", personalAccountAddress, "\n");

  const [coreVaultXrplAddress, initialBalance] = await Promise.all([
    getDirectMintingPaymentAddress(assetManagerAddress),
    getFxrpBalance(personalAccountAddress),
  ]);
  console.log("Core Vault XRPL address:", coreVaultXrplAddress, "\n");
  console.log("AssetManagerFXRP address:", assetManagerAddress, "\n");
  console.log("Initial FXRP balance:", initialBalance, "\n");

  await sendDirectMintPayment({
    coreVaultXrplAddress,
    recipientAddress: personalAccountAddress,
    amountXrp: DIRECT_MINT_AMOUNT_XRP,
    xrplClient,
    xrplWallet,
  });

  const mintEvent = await waitForDirectMintingExecuted({
    assetManagerAddress,
    targetAddress: personalAccountAddress,
  });

  console.log("DirectMintingExecuted event:", mintEvent, "\n");
  console.log("Minted amount (UBA):", mintEvent.args.mintedAmountUBA, "\n");
  console.log("Minting fee (UBA):", mintEvent.args.mintingFeeUBA, "\n");
  console.log("Executor fee (UBA):", mintEvent.args.executorFeeUBA, "\n");

  const finalBalance = await getFxrpBalance(personalAccountAddress);
  console.log("Final FXRP balance:", finalBalance, "\n");
  console.log("FXRP minted:", finalBalance - initialBalance, "\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

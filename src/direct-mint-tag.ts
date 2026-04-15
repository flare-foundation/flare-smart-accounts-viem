import { Client, Wallet } from "xrpl";
import type { Address } from "viem";
import { sendXrplPayment } from "./utils/xrpl";
import { account, publicClient, walletClient } from "./utils/client";
import { getPersonalAccountAddress } from "./utils/smart-accounts";
import { getContractAddressByName } from "./utils/flare-contract-registry";
import { getFxrpBalance } from "./utils/fassets";
import { abi as iMintingTagManagerAbi } from "./abis/IMintingTagManager";
import { getDirectMintingPaymentAddress, waitForDirectMintingExecuted } from "./utils/direct-minting";

// Amount in XRP to send for direct minting (must cover minted value + minting fee + executor fee)
const DIRECT_MINT_AMOUNT_XRP = 10;

// TODO: Once MintingTagManager is registered in FlareContractRegistry, replace with:
//   const mintingTagManagerAddress = await getContractAddressByName("MintingTagManager");
const MINTING_TAG_MANAGER_ADDRESS: Address = "0x094511737909b626391106bBc21B25feb2D67B96";

async function reserveTag(): Promise<bigint> {
  const reservationFee = await publicClient.readContract({
    address: MINTING_TAG_MANAGER_ADDRESS,
    abi: iMintingTagManagerAbi,
    functionName: "reservationFee",
  });
  console.log("Tag reservation fee (wei):", reservationFee, "\n");

  const { result, request } = await publicClient.simulateContract({
    account,
    address: MINTING_TAG_MANAGER_ADDRESS,
    abi: iMintingTagManagerAbi,
    functionName: "reserve",
    value: reservationFee as bigint,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const tag = result as bigint;
  console.log("Reserved tag:", tag, "\n");

  return tag;
}

async function setMintingRecipient(tag: bigint, recipient: Address): Promise<void> {
  const { request } = await publicClient.simulateContract({
    account,
    address: MINTING_TAG_MANAGER_ADDRESS,
    abi: iMintingTagManagerAbi,
    functionName: "setMintingRecipient",
    args: [tag, recipient],
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Set minting recipient for tag", tag, "to", recipient, "\n");
}

async function getMintingRecipient(tag: bigint): Promise<Address> {
  return publicClient.readContract({
    address: MINTING_TAG_MANAGER_ADDRESS,
    abi: iMintingTagManagerAbi,
    functionName: "mintingRecipient",
    args: [tag],
  }) as Promise<Address>;
}

async function getOrReserveTag(recipient: Address): Promise<bigint> {
  if (process.env.MINTING_TAG) {
    const tag = BigInt(process.env.MINTING_TAG);
    console.log("Using existing minting tag from .env:", tag, "\n");
    return tag;
  }

  const tag = await reserveTag();
  await setMintingRecipient(tag, recipient);
  console.log("Add MINTING_TAG=" + tag.toString() + " to your .env to reuse this tag.\n");
  return tag;
}

async function main() {
  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const [personalAccountAddress, assetManagerAddress] = await Promise.all([
    getPersonalAccountAddress(xrplWallet.address),
    getContractAddressByName("AssetManagerFXRP"),
  ]);
  console.log("Personal account address:", personalAccountAddress, "\n");

  const tag = await getOrReserveTag(personalAccountAddress);

  const configuredRecipient = await getMintingRecipient(tag);
  console.log("Minting recipient for tag:", configuredRecipient, "\n");

  const [coreVaultXrplAddress, initialBalance] = await Promise.all([
    getDirectMintingPaymentAddress(assetManagerAddress),
    getFxrpBalance(personalAccountAddress),
  ]);
  console.log("Core Vault XRPL address:", coreVaultXrplAddress, "\n");
  console.log("AssetManagerFXRP address:", assetManagerAddress, "\n");
  console.log("Initial FXRP balance:", initialBalance, "\n");

  const transaction = await sendXrplPayment({
    destination: coreVaultXrplAddress,
    amount: DIRECT_MINT_AMOUNT_XRP,
    destinationTag: Number(tag),
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log("Direct mint XRPL transaction hash:", transaction.result.hash, "\n");

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

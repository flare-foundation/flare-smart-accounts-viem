import { Client, Wallet } from "xrpl";
import type { Address } from "viem";
import { sendXrplPayment } from "./utils/xrpl";
import { getPersonalAccountAddress } from "./utils/smart-accounts";
import { getContractAddressByName, getDirectMintingPaymentAddress } from "./utils/flare-contract-registry";
import { computeDirectMintingPaymentAmountXrp, getFxrpBalance, waitForDirectMintingExecuted } from "./utils/fassets";

// The memo is a packed 32-byte PaymentReference (see AssetManager's PaymentReference.sol):
//   [ 8-byte type tag | 4 zero bytes | 20-byte recipient address ]
// The type tag is "FBPRfA" (0x464250526641, "Flare Bridge Payment Reference / fAsset")
// followed by the 2-byte discriminator 0x0018 identifying DIRECT_MINTING to a smart account.
// The 4 zero bytes pad the 160-bit address up to the 192-bit payload slot.
const DIRECT_MINTING_PREFIX = "4642505266410018";

/**
 * Builds the 32-byte direct-minting PaymentReference memo for an XRPL payment
 * to the FXRP Core Vault. The returned hex string encodes the DIRECT_MINTING
 * type tag followed by the recipient smart account address (see prefix comment
 * above for the bit layout).
 *
 * See https://dev.flare.network/fassets/direct-minting#memo-field
 */
function buildDirectMintingMemo(recipientAddress: Address): string {
  return DIRECT_MINTING_PREFIX + "00000000" + recipientAddress.slice(2).toLowerCase();
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
  // Net FXRP amount to mint in XRP. Minting + executor fees are fetched from
  // AssetManagerFXRP and added on top to form the XRPL payment amount.
  const fxrpMintAmount = 10;

  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const [personalAccountAddress, assetManagerAddress] = await Promise.all([
    getPersonalAccountAddress(xrplWallet.address),
    getContractAddressByName("AssetManagerFXRP"),
  ]);
  console.log("Personal account address:", personalAccountAddress, "\n");

  const [coreVaultXrplAddress, initialBalance, paymentAmountXrp] = await Promise.all([
    getDirectMintingPaymentAddress(assetManagerAddress),
    getFxrpBalance(personalAccountAddress),
    computeDirectMintingPaymentAmountXrp({ netMintAmountXrp: fxrpMintAmount }),
  ]);
  console.log("Core Vault XRPL address:", coreVaultXrplAddress, "\n");
  console.log("AssetManagerFXRP address:", assetManagerAddress, "\n");
  console.log("Initial FXRP balance:", initialBalance, "\n");
  console.log("Payment amount (XRP, net mint + fees):", paymentAmountXrp, "\n");

  await sendDirectMintPayment({
    coreVaultXrplAddress,
    recipientAddress: personalAccountAddress,
    amountXrp: paymentAmountXrp,
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

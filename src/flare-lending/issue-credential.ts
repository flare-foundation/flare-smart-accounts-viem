import { Client, Wallet } from "xrpl";
import { acceptCredential, issueCredential } from "./utils";

/**
 * Issues a new XRPL credential from the VAULT_SEED account.
 */
async function main() {
  const xrplRpcUrl = process.env.XRPL_TESTNET_RPC_URL;
  const vaultSeed = process.env.VAULT_SEED;

  if (!xrplRpcUrl || !vaultSeed) {
    throw new Error("Missing XRPL_TESTNET_RPC_URL or VAULT_SEED in .env");
  }

  const xrplClient = new Client(xrplRpcUrl);
  const vaultWallet = Wallet.fromSeed(vaultSeed);

  // CredentialType: hex-encoded string (1–64 bytes). Using "flare-lending-vault".
  const credentialTypeHex = Buffer.from("flare-lending-vault", "utf8").toString("hex");

  const issueTxHash = await issueCredential({
    xrplClient,
    xrplWallet: vaultWallet,
    recipientXrplAddress: vaultWallet.address,
    credentialType: credentialTypeHex,
  });

  console.log("Issuer:", vaultWallet.address);
  console.log("Subject:", vaultWallet.address);
  console.log("CredentialType (hex):", credentialTypeHex);
  if (issueTxHash !== null) {
    console.log("Transaction hash:", issueTxHash);
  }

  const acceptTxHash = await acceptCredential({
    xrplClient,
    xrplWallet: vaultWallet,
    issuerXrplAddress: vaultWallet.address,
    credentialType: credentialTypeHex,
  });

  if (acceptTxHash !== null) {
    console.log("\nCredential accepted successfully.");
    console.log("Accept transaction hash:", acceptTxHash);
  } else {
    console.log("\nCredential already accepted (tecDUPLICATE).");
  }
}

void main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

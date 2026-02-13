import { Client, Wallet } from "xrpl";

/**
 * Transfers/mints an amount of MPT from the issuer to a given XRPL account.
 * The recipient must have authorized the MPT (MPTokenAuthorize) before this is called;
 * this function performs that authorization as the recipient, then sends the Payment as the issuer.
 *
 * @see https://xrpl.org/docs/tutorials/javascript/send-payments/sending-mpts
 */
export async function sendMptToAccount(
  xrplRpcUrl: string,
  issuerXrplSeed: string,
  recipientXrplSeed: string,
  mptIssuanceId: string,
  sendDrops: string
): Promise<void> {
  const xrplClient = new Client(xrplRpcUrl);
  const issuerWallet = Wallet.fromSeed(issuerXrplSeed);
  const recipientWallet = Wallet.fromSeed(recipientXrplSeed);

  await xrplClient.connect();

  try {
    // 1. Recipient authorizes receipt of this MPT
    const authTransactionData = {
      TransactionType: "MPTokenAuthorize" as const,
      Account: recipientWallet.address,
      MPTokenIssuanceID: mptIssuanceId,
    };
    const authTransactionPrepared = await xrplClient.autofill(authTransactionData);
    const authTransactionSigned = recipientWallet.sign(authTransactionPrepared);
    const authResult = await xrplClient.submitAndWait(authTransactionSigned.tx_blob);
    const authMeta = authResult.result.meta as { TransactionResult?: string } | string;
    const authResultCode = typeof authMeta === "string" ? authMeta : authMeta.TransactionResult;
    if (authResultCode !== "tesSUCCESS") {
      throw new Error(`MPTokenAuthorize failed: ${authResultCode}`);
    }
    console.log("Recipient authorized MPT.");

    // 2. Issuer sends MPT to recipient
    const paymentTransactionData = {
      TransactionType: "Payment" as const,
      Account: issuerWallet.address,
      Destination: recipientWallet.address,
      Amount: {
        mpt_issuance_id: mptIssuanceId,
        value: sendDrops,
      },
    };
    const paymentTransactionPrepared = await xrplClient.autofill(paymentTransactionData);
    const paymentTransactionSigned = issuerWallet.sign(paymentTransactionPrepared);
    const paymentResult = await xrplClient.submitAndWait(paymentTransactionSigned.tx_blob);
    const paymentMeta = paymentResult.result.meta as { TransactionResult?: string } | string;
    const paymentResultCode = typeof paymentMeta === "string" ? paymentMeta : paymentMeta.TransactionResult;
    if (paymentResultCode !== "tesSUCCESS") {
      throw new Error(`Payment failed: ${paymentResultCode}`);
    }
    console.log(`Minted ${sendDrops} MPT to ${recipientWallet.address}.`);
    console.log(`Transaction hash: ${paymentResult.result.hash}`, "\n");
  } finally {
    await xrplClient.disconnect();
  }
}

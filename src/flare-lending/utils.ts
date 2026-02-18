import { Client, Wallet } from "xrpl";

/** XRPL Credential ledger entry. */
export type CredentialObject = {
  LedgerEntryType: "Credential";
  Subject: string;
  Issuer: string;
  CredentialType: string;
  PreviousTxnID: string;
  PreviousTxnLgrSeq: number;
  Flags?: number;
  Expiration?: number;
  URI?: string;
  index?: string;
};

/**
 * Fetches a credential from the ledger by issuer, subject, and credential type.
 * The credential may be in the issuer's directory (not yet accepted) or the
 * subject's directory (accepted).
 *
 * @returns The credential object, or null if not found.
 */
export async function fetchCredential({
  xrplClient,
  issuerXrplAddress,
  subjectXrplAddress,
  credentialType,
}: {
  xrplClient: Client;
  issuerXrplAddress: string;
  subjectXrplAddress: string;
  credentialType: string;
}): Promise<CredentialObject | null> {
  const isConnected = xrplClient.isConnected();
  if (!isConnected) {
    await xrplClient.connect();
  }

  try {
    const accountsToQuery = [...new Set([subjectXrplAddress, issuerXrplAddress])];

    for (const account of accountsToQuery) {
      const response = await xrplClient.request({
        command: "account_objects",
        account,
        type: "credential",
        ledger_index: "validated",
      });

      const objects = (response.result.account_objects ?? []) as CredentialObject[];
      const credential = objects.find(
        (obj) =>
          obj.LedgerEntryType === "Credential" &&
          obj.Issuer === issuerXrplAddress &&
          obj.Subject === subjectXrplAddress &&
          obj.CredentialType.toLowerCase() === credentialType.toLowerCase()
      );

      if (credential) {
        return credential;
      }
    }

    return null;
  } finally {
    if (!isConnected) {
      await xrplClient.disconnect();
    }
  }
}

/**
 * Issues a new XRPL credential from the given wallet to the recipient.
 * Uses CredentialCreate to provisionally issue a credential; the subject must
 * accept it with CredentialAccept for it to become valid.
 *
 * @param credentialType - Hex-encoded credential type (1–64 bytes).
 * @returns The transaction hash on success, or the credential's PreviousTxnID when tecDUPLICATE (fetched from ledger), or null if fetch fails.
 * @see https://xrpl.org/docs/references/protocol/transactions/types/credentialcreate
 * @see https://xrpl.org/docs/concepts/decentralized-storage/credentials
 */
export async function issueCredential({
  xrplClient,
  xrplWallet,
  recipientXrplAddress,
  credentialType,
}: {
  xrplClient: Client;
  xrplWallet: Wallet;
  recipientXrplAddress: string;
  credentialType: string;
}): Promise<string | null> {
  await xrplClient.connect();

  try {
    const credentialCreateData = {
      TransactionType: "CredentialCreate" as const,
      Account: xrplWallet.address,
      Subject: recipientXrplAddress,
      CredentialType: credentialType,
    };

    const preparedTransaction = await xrplClient.autofill(credentialCreateData);
    const signedTransaction = xrplWallet.sign(preparedTransaction);
    const result = await xrplClient.submitAndWait(signedTransaction.tx_blob);

    const meta = result.result.meta as { TransactionResult?: string } | string;
    const resultCode = typeof meta === "string" ? meta : meta.TransactionResult;

    if (resultCode === "tecDUPLICATE") {
      console.log("Credential already issued (tecDUPLICATE), fetching the credential.");
      const credential = await fetchCredential({
        xrplClient,
        issuerXrplAddress: xrplWallet.address,
        subjectXrplAddress: recipientXrplAddress,
        credentialType,
      });
      return credential?.PreviousTxnID ?? null;
    }
    if (resultCode !== "tesSUCCESS") {
      throw new Error(`CredentialCreate failed with result: ${resultCode}`);
    }

    console.log("Credential issued successfully.");
    return result.result.hash as string;
  } finally {
    await xrplClient.disconnect();
  }
}

/**
 * Accepts a provisionally issued credential. Only the subject can accept;
 * the xrplWallet must be the subject (Account) of the credential.
 *
 * @param issuerXrplAddress - The address of the issuer that created the credential.
 * @param credentialType - Hex-encoded credential type (1–64 bytes).
 * @returns The transaction hash on success, or the credential's PreviousTxnID when tecDUPLICATE (fetched from ledger), or null if fetch fails.
 * @see https://xrpl.org/docs/references/protocol/transactions/types/credentialaccept
 */
export async function acceptCredential({
  xrplClient,
  xrplWallet,
  issuerXrplAddress,
  credentialType,
}: {
  xrplClient: Client;
  xrplWallet: Wallet;
  issuerXrplAddress: string;
  credentialType: string;
}): Promise<string | null> {
  await xrplClient.connect();

  try {
    const credentialAcceptData = {
      TransactionType: "CredentialAccept" as const,
      Account: xrplWallet.address,
      Issuer: issuerXrplAddress,
      CredentialType: credentialType,
    };

    const preparedTransaction = await xrplClient.autofill(credentialAcceptData);
    const signedTransaction = xrplWallet.sign(preparedTransaction);
    const result = await xrplClient.submitAndWait(signedTransaction.tx_blob);

    const meta = result.result.meta as { TransactionResult?: string } | string;
    const resultCode = typeof meta === "string" ? meta : meta.TransactionResult;

    if (resultCode === "tecDUPLICATE") {
      const credential = await fetchCredential({
        xrplClient,
        issuerXrplAddress,
        subjectXrplAddress: xrplWallet.address,
        credentialType,
      });
      return credential?.PreviousTxnID ?? null;
    }
    if (resultCode !== "tesSUCCESS") {
      throw new Error(`CredentialAccept failed with result: ${resultCode}`);
    }

    return result.result.hash as string;
  } finally {
    await xrplClient.disconnect();
  }
}

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

import { type GetContractEventsReturnType } from "viem";
import { Client, Wallet } from "xrpl";
import { publicClient } from "../utils/client";
import { abi as BridgeAbi } from "../abis/DummyBridge";

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
    return result.result.hash;
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

    return result.result.hash;
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
    // 1. Recipient authorizes receipt of this MPT (skip if already authorized)
    const accountObjectsResponse = await xrplClient.request({
      command: "account_objects",
      account: recipientWallet.address,
      type: "mptoken",
      ledger_index: "validated",
    });
    const mptObjects = (accountObjectsResponse.result.account_objects ?? []) as Array<{
      LedgerEntryType?: string;
      MPTokenIssuanceID?: string;
    }>;
    const alreadyAuthorized = mptObjects.some(
      (obj) => obj.LedgerEntryType === "MPToken" && obj.MPTokenIssuanceID === mptIssuanceId
    );

    if (!alreadyAuthorized) {
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
    } else {
      console.log("Recipient already authorized for MPT, skipping MPTokenAuthorize.");
    }

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

export type InitiateBridgeEventLog = GetContractEventsReturnType<typeof BridgeAbi, "InitiateBridge">[number];

export async function findLatestInitiateBridgeEventInLast30Blocks({
  bridgeAddress,
  personalAccountAddress,
}: {
  bridgeAddress: `0x${string}`;
  personalAccountAddress: string;
}): Promise<InitiateBridgeEventLog> {
  // RPC allows max 30 blocks per eth_getLogs; range is inclusive so we use at most 30 blocks
  const RPC_MAX_BLOCK_RANGE = 30n;
  const toBlock = await publicClient.getBlockNumber();
  const fromBlock = toBlock >= RPC_MAX_BLOCK_RANGE ? toBlock - RPC_MAX_BLOCK_RANGE + 1n : 0n;

  const logs = await publicClient.getContractEvents({
    address: bridgeAddress,
    abi: BridgeAbi,
    eventName: "InitiateBridge",
    fromBlock,
    toBlock,
  });

  const matchingEvents = (logs as InitiateBridgeEventLog[]).filter(
    (log) => log.args.from?.toLowerCase() === personalAccountAddress.toLowerCase()
  );
  if (matchingEvents.length === 0) {
    throw new Error(
      `No InitiateBridge event with from=${personalAccountAddress} in the last ${RPC_MAX_BLOCK_RANGE} blocks (${fromBlock}-${toBlock})`
    );
  }

  const latest = matchingEvents.sort((a, b) => {
    const aBlock = a.blockNumber ?? 0n;
    const bBlock = b.blockNumber ?? 0n;
    if (bBlock !== aBlock) return Number(bBlock - aBlock);
    return (b.transactionIndex ?? 0) - (a.transactionIndex ?? 0);
  })[0]!;

  return latest;
}

/**
 * Transfers the InitiateBridge event amount of MPT on XRPL from the VAULT_SEED account
 * to the XRPL address in the event's `to` field.
 * The event amount is multiplied by 10^assetScale for the MPT value.
 * The recipient (recipientXrplWallet) is authorized to receive the MPT (MPTokenAuthorize)
 * before sending, if not already authorized.
 */
export async function transferEventAmountMptToXrplAddress({
  initiateBridgeEvent,
  xrplClient,
  vaultWallet,
  mptIssuanceId,
  assetScale,
  recipientXrplWallet,
}: {
  initiateBridgeEvent: InitiateBridgeEventLog;
  xrplClient: Client;
  vaultWallet: Wallet;
  mptIssuanceId: string;
  assetScale: number;
  recipientXrplWallet: Wallet;
}): Promise<void> {
  const toXrplAddress = initiateBridgeEvent.args.to;
  const amount = initiateBridgeEvent.args.amount;
  if (!toXrplAddress || amount === undefined) {
    throw new Error("InitiateBridge event missing to or amount");
  }

  const valueScaled = amount * 10n ** BigInt(assetScale);

  await xrplClient.connect();

  try {
    const accountObjectsResponse = await xrplClient.request({
      command: "account_objects",
      account: recipientXrplWallet.address,
      type: "mptoken",
      ledger_index: "validated",
    });
    const mptObjects = (accountObjectsResponse.result.account_objects ?? []) as Array<{
      LedgerEntryType?: string;
      MPTokenIssuanceID?: string;
    }>;
    const alreadyAuthorized = mptObjects.some(
      (obj) => obj.LedgerEntryType === "MPToken" && obj.MPTokenIssuanceID === mptIssuanceId
    );

    if (!alreadyAuthorized) {
      const authTransactionData = {
        TransactionType: "MPTokenAuthorize" as const,
        Account: recipientXrplWallet.address,
        MPTokenIssuanceID: mptIssuanceId,
      };
      const authPrepared = await xrplClient.autofill(authTransactionData);
      const authSigned = recipientXrplWallet.sign(authPrepared);
      const authResult = await xrplClient.submitAndWait(authSigned.tx_blob);
      const authMeta = authResult.result.meta as { TransactionResult?: string } | string;
      const authCode = typeof authMeta === "string" ? authMeta : authMeta.TransactionResult;

      if (authCode !== "tesSUCCESS") {
        throw new Error(`MPTokenAuthorize failed: ${authCode}`);
      } else {
        console.log("Recipient authorized for MPT.");
      }
    } else {
      console.log("Recipient already authorized for MPT, skipping MPTokenAuthorize.");
    }

    const paymentTransactionData = {
      TransactionType: "Payment" as const,
      Account: vaultWallet.address,
      Destination: toXrplAddress,
      Amount: {
        mpt_issuance_id: mptIssuanceId,
        value: valueScaled.toString(),
      },
    };
    const paymentTransactionPrepared = await xrplClient.autofill(paymentTransactionData);
    const paymentTransactionSigned = vaultWallet.sign(paymentTransactionPrepared);
    const paymentResult = await xrplClient.submitAndWait(paymentTransactionSigned.tx_blob);
    const paymentMeta = paymentResult.result.meta as { TransactionResult?: string } | string;
    const paymentResultCode = typeof paymentMeta === "string" ? paymentMeta : paymentMeta.TransactionResult;
    if (paymentResultCode !== "tesSUCCESS") {
      throw new Error(`MPT Payment failed: ${paymentResultCode}`);
    }
    console.log(
      `Transferred ${valueScaled.toString()} MPT (${amount.toString()} × 10^${assetScale}) to ${toXrplAddress}. Tx hash: ${paymentResult.result.hash}`,
      "\n"
    );
  } finally {
    await xrplClient.disconnect();
  }
}

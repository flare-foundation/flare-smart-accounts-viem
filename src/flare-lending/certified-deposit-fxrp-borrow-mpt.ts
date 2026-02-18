import { encodeFunctionData, toHex } from "viem";
import type { Log } from "viem";
import { Client, Wallet } from "xrpl";
import { MPT_ISSUANCE_ID } from "./config";
import { abi } from "../abis/CustomInstructionsFacet";
import { abi as BridgeAbi } from "../abis/DummyBridge";
import { abi as LendingAbi } from "../abis/DummyCertifiedLending";
import { abi as ERC20Abi } from "../abis/ERC20";
import { abi as iInstructionsFacetAbi } from "../abis/IInstructionsFacet";
import { publicClient, walletClient } from "../utils/client";
import { account } from "../utils/client";
import type { CustomInstructionExecutedEventType } from "../utils/event-types";
import {
  prepareAttestationRequest,
  retrieveDataAndProofWithRetry,
  submitAttestationRequest,
  type Web2JsonProof,
} from "../utils/fdc";
import {
  getInstructionFee,
  getOperatorXrplAddresses,
  getPersonalAccountAddress,
  MASTER_ACCOUNT_CONTROLLER_ADDRESS,
  registerCustomInstruction,
  type CustomInstruction,
} from "../utils/smart-accounts";
import { sendXrplPayment } from "../utils/xrpl";

async function encodeCustomInstruction(instructions: CustomInstruction[], walletId: number) {
  const encodedInstruction = (await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: abi,
    functionName: "encodeCustomInstruction",
    args: [instructions],
  })) as `0x${string}`;
  // NOTE:(Nik) We cut off the `0x` prefix and the first 2 bytes to get the length down to 30 bytes
  return ("0xff" + toHex(walletId, { size: 1 }).slice(2) + encodedInstruction.slice(6)) as `0x${string}`;
}

async function getCertificateFdcProof(xrplWallet: Wallet, dummyLendingAddress: `0x${string}`): Promise<Web2JsonProof> {
  const subjectXrplAddress = xrplWallet.address;
  const xrplJsonRpcUrl = "https://testnet.xrpl-labs.com/";

  const [expectedCredentialType, expectedIssuer] = (await Promise.all([
    publicClient.readContract({
      address: dummyLendingAddress,
      abi: LendingAbi,
      functionName: "CREDENTIAL_TYPE",
      args: [],
    }),
    publicClient.readContract({
      address: dummyLendingAddress,
      abi: LendingAbi,
      functionName: "CREDENTIAL_ISSUER",
      args: [],
    }),
  ])) as [string, string];
  const escapeForJq = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  // Verifier disallows jq's error(); use empty when no match so the filter is accepted (encoding will then fail).
  const postProcessJq = `.result | . as $res | ($res | .account_objects[]? | select(.CredentialType == "${escapeForJq(expectedCredentialType)}" and .Issuer == "${escapeForJq(expectedIssuer)}")) as $obj | if $obj then {account: $res.account, credentialType: $obj.CredentialType, issuer: $obj.Issuer} else {account: $res.account, credentialType: "", issuer: ""} end`;

  const attestationType = "Web2Json";
  const sourceId = "PublicWeb2";
  // ABI signature must match the struct used to decode the jq output (DataTransportObject).
  // Derived from DummyCertifiedLending.abiSignatureHack(DataTransportObject) so it stays in sync.
  const abiSignatureHack = LendingAbi.find((f) => f.type === "function" && f.name === "abiSignatureHack");
  const dtoInput = (abiSignatureHack && "inputs" in abiSignatureHack && abiSignatureHack.inputs?.[0]) ?? null;
  if (!dtoInput || typeof dtoInput !== "object") {
    throw new Error("DummyCertifiedLending ABI missing abiSignatureHack(DataTransportObject) input type");
  }
  const abiSignature = JSON.stringify(dtoInput);
  const fdcCredentialCheckRequestBody = {
    url: xrplJsonRpcUrl,
    httpMethod: "POST" as const,
    headers: JSON.stringify({ "Content-Type": "application/json" }),
    queryParams: JSON.stringify({}),
    body: JSON.stringify({
      method: "account_objects",
      params: [
        {
          account: subjectXrplAddress,
          type: "credential",
          ledger_index: "validated",
        },
      ],
    }),
    postProcessJq,
    abiSignature,
  };

  const verifierBaseUrl = process.env.VERIFIER_URL_TESTNET!;
  const apiKey = process.env.VERIFIER_API_KEY_TESTNET;

  const verifierUrl = `${verifierBaseUrl.replace(/\/$/, "")}/verifier/web2/Web2Json/prepareRequest`;
  if (!verifierUrl || !apiKey) {
    throw new Error(
      "FDC verifier config missing: set VERIFIER_URL_TESTNET (or WEB2JSON_VERIFIER_URL_TESTNET) and VERIFIER_API_KEY_TESTNET"
    );
  }

  const { abiEncodedRequest } = await prepareAttestationRequest(
    verifierUrl,
    apiKey,
    attestationType,
    sourceId,
    fdcCredentialCheckRequestBody as Record<string, unknown>
  );
  console.log("Abi encoded request:", abiEncodedRequest, "\n");

  const roundId = await submitAttestationRequest(abiEncodedRequest as `0x${string}`);

  const web2JsonProof = await retrieveDataAndProofWithRetry(abiEncodedRequest, roundId);
  console.log("Web2Json proof:", web2JsonProof, "\n");

  return web2JsonProof;
}

/**
 * Ensures the XRPL user is validated on DummyLending. If validUser(personalAccount) is false,
 * fetches the certificate FDC proof and calls validateUser(proof) on the DummyLending contract.
 */
async function validateUser(xrplWallet: Wallet, dummyLendingAddress: `0x${string}`): Promise<void> {
  const personalAccountAddress = await getPersonalAccountAddress(xrplWallet.address);
  const isAlreadyValid = await publicClient.readContract({
    address: dummyLendingAddress,
    abi: LendingAbi,
    functionName: "validUser",
    args: [personalAccountAddress],
  });
  if (isAlreadyValid) {
    console.log("User already validated on DummyLending, skipping validateUser tx.\n");
    return;
  }
  console.log("Validating user on DummyLending...");
  const certificateFdcProof = await getCertificateFdcProof(xrplWallet, dummyLendingAddress);
  const hash = await walletClient.writeContract({
    account,
    address: dummyLendingAddress,
    abi: LendingAbi,
    functionName: "validateUser",
    args: [certificateFdcProof],
  });
  console.log("validateUser transaction hash:", hash, "\n");
  await publicClient.waitForTransactionReceipt({ hash });
}

async function sendCustomInstruction({
  encodedInstruction,
  xrplClient,
  xrplWallet,
}: {
  encodedInstruction: `0x${string}`;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const operatorXrplAddress = (await getOperatorXrplAddresses())[0] as string;

  const instructionFee = await getInstructionFee(encodedInstruction);
  console.log("Instruction fee:", instructionFee, "\n");

  const customInstructionTransaction = await sendXrplPayment({
    destination: operatorXrplAddress,
    amount: instructionFee,
    memos: [{ Memo: { MemoData: encodedInstruction.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });

  return customInstructionTransaction;
}

async function waitForCustomInstructionExecutedEvent({
  encodedInstruction,
  personalAccountAddress,
}: {
  encodedInstruction: `0x${string}`;
  personalAccountAddress: string;
}) {
  let customInstructionExecutedEvent: CustomInstructionExecutedEventType | undefined;
  let customInstructionExecutedEventFound = false;

  const unwatchCustomInstructionExecuted = publicClient.watchContractEvent({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iInstructionsFacetAbi,
    eventName: "CustomInstructionExecuted",
    onLogs: (logs) => {
      for (const log of logs) {
        customInstructionExecutedEvent = log as CustomInstructionExecutedEventType;
        if (
          customInstructionExecutedEvent.args.callHash.slice(6) !== encodedInstruction.slice(6) ||
          customInstructionExecutedEvent.args.personalAccount.toLowerCase() !== personalAccountAddress.toLowerCase()
        ) {
          continue;
        }
        customInstructionExecutedEventFound = true;
        break;
      }
    },
  });

  console.log("Waiting for CustomInstructionExecuted event...");
  while (!customInstructionExecutedEventFound) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  unwatchCustomInstructionExecuted();

  return customInstructionExecutedEvent;
}

type InitiateBridgeEventArgs = { from?: string; to?: string; amount?: bigint };
type InitiateBridgeEventLog = Log & { args: InitiateBridgeEventArgs };

async function findLatestInitiateBridgeEventInLast30Blocks({
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
 * Transfers the InitiateBridge event amount of MPT on XRPL from the vault wallet
 * to the XRPL address in the event's `to` field.
 * The event amount is multiplied by 10^assetScale for the MPT value.
 * The recipient (recipientXrplWallet) is authorized to receive the MPT (MPTokenAuthorize)
 * before sending, if not already authorized.
 */
async function transferEventAmountMptToXrplAddress({
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

// NOTE:(Nik) For this example to work, you first need to faucet C2FLR to your personal account address.
async function main() {
  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);
  const vaultWallet = Wallet.fromSeed(process.env.VAULT_SEED!);

  const walletId = 0;

  const dummyERC20Address = "0x4b441981AB1B20194d51EdE2B11c022C46f3F86A";
  const dummyLendingAddress = "0xfE2dd3051781E0bBC62318752e97399b05e736b6" as `0x${string}`;
  const dummyBridgeAddress = "0x9eCCC14a0088578365C9F833E130DEE857F97B8D";

  const FXRPAddress = "0x0b6A3645c240605887a5532109323A3E12273dc7";

  const amountToDeposit = 100; // In wei
  const amountToBorrow = 10; // In wei

  await validateUser(xrplWallet, dummyLendingAddress);

  // NOTE:(Filip) Allow + call deposit + take Loan + approve bridge + withdraw from bridge
  const allowInstructionFXRP = {
    targetContract: FXRPAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: ERC20Abi,
      functionName: "approve",
      args: [dummyLendingAddress, amountToDeposit],
    }),
  };

  const depositCollateral = {
    targetContract: dummyLendingAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: LendingAbi,
      functionName: "depositCollateral",
      args: [amountToDeposit],
    }),
  };

  const takeLoanInstruction = {
    targetContract: dummyLendingAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: LendingAbi,
      functionName: "takeLoan",
      args: [amountToBorrow],
    }),
  };

  const allowInstructionUSDT = {
    targetContract: dummyERC20Address,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: ERC20Abi,
      functionName: "approve",
      args: [dummyBridgeAddress, amountToBorrow],
    }),
  };

  const startBridgeInstruction = {
    targetContract: dummyBridgeAddress,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: BridgeAbi,
      functionName: "initiateBridge",
      args: [xrplWallet.address, amountToBorrow],
    }),
  };

  const customInstructions = [
    allowInstructionFXRP,
    depositCollateral,
    takeLoanInstruction,
    allowInstructionUSDT,
    startBridgeInstruction,
  ] as CustomInstruction[];
  console.log("Custom instructions:", customInstructions, "\n");

  const personalAccountAddress = await getPersonalAccountAddress(xrplWallet.address);
  console.log("Personal account address:", personalAccountAddress, "\n");

  const customInstructionCallHash = await registerCustomInstruction(customInstructions);
  console.log("Custom instruction call hash:", customInstructionCallHash, "\n");
  const encodedInstruction = await encodeCustomInstruction(customInstructions, walletId);
  console.log("Encoded instructions:", encodedInstruction, "\n");

  const customInstructionTransaction = await sendCustomInstruction({
    encodedInstruction,
    xrplClient,
    xrplWallet,
  });
  console.log("Custom instruction transaction hash:", customInstructionTransaction.result.hash, "\n");

  const customInstructionExecutedEvent = await waitForCustomInstructionExecutedEvent({
    encodedInstruction,
    personalAccountAddress,
  });
  console.log("CustomInstructionExecuted event:", customInstructionExecutedEvent, "\n");

  const initiateBridgeEvent = await findLatestInitiateBridgeEventInLast30Blocks({
    bridgeAddress: dummyBridgeAddress as `0x${string}`,
    personalAccountAddress,
  });
  console.log("InitiateBridge event:", initiateBridgeEvent, "\n");

  await transferEventAmountMptToXrplAddress({
    initiateBridgeEvent,
    xrplClient,
    vaultWallet,
    mptIssuanceId: MPT_ISSUANCE_ID,
    assetScale: 6,
    recipientXrplWallet: xrplWallet,
  });
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { decodeAbiParameters, stringToHex, toHex } from "viem";
import { getContractAddressByName } from "./flare-contract-registry";
import { publicClient } from "./client";
import { walletClient } from "./client";
import { account } from "./client";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { abi as DummyCertifiedLendingAbi } from "../abis/DummyCertifiedLending";

/** IWeb2Json.RequestBody (flare-periphery-contracts) */
export interface IWeb2JsonRequestBody {
  url: string;
  httpMethod: string;
  headers: string;
  queryParams: string;
  body: string;
  postProcessJq: string;
  abiSignature: string;
}

/** IWeb2Json.ResponseBody (flare-periphery-contracts) */
export interface IWeb2JsonResponseBody {
  abiEncodedData: `0x${string}`;
}

/** IWeb2Json.Response (flare-periphery-contracts) */
export interface IWeb2JsonResponse {
  attestationType: `0x${string}`;
  sourceId: `0x${string}`;
  votingRound: bigint;
  lowestUsedTimestamp: bigint;
  requestBody: IWeb2JsonRequestBody;
  responseBody: IWeb2JsonResponseBody;
}

/** IWeb2Json.Proof struct (flare-periphery-contracts), for use with validateUser etc. */
export interface IWeb2JsonProof {
  merkleProof: readonly `0x${string}`[];
  data: IWeb2JsonResponse;
}

/** Decoded IWeb2Json.Proof; use when passing to validateUser etc. */
export type Web2JsonProof = IWeb2JsonProof;

/** Decoded IWeb2Json.Response (data part of Proof). */
export type Web2JsonResponse = IWeb2JsonResponse;

const POLL_INTERVAL_MS = 30_000;
const DA_LAYER_POLL_MS = 10_000;
const RETRY_SLEEP_MS = 20_000;
const RETRY_ATTEMPTS = 10;

const validateUserFragment = DummyCertifiedLendingAbi.find(
  (f) => f.type === "function" && "name" in f && f.name === "validateUser"
) as { inputs: readonly { components?: readonly unknown[] }[] } | undefined;
const proofParam = validateUserFragment?.inputs?.[0];
const iWeb2JsonResponseAbiParam = proofParam?.components?.[1];

function decodeWeb2JsonResponse(responseHex: `0x${string}`): Web2JsonResponse {
  if (!iWeb2JsonResponseAbiParam || typeof iWeb2JsonResponseAbiParam !== "object") {
    throw new Error("IWeb2Json.Response ABI not found on DummyCertifiedLending validateUser");
  }
  const decoded = decodeAbiParameters(
    [iWeb2JsonResponseAbiParam] as Parameters<typeof decodeAbiParameters>[0],
    responseHex
  );
  console.log("Decoded:", decoded);
  return decoded[0] as Web2JsonResponse;
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ statusCode: number; body: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const responseBody = await response.text();
  return { statusCode: response.status, body: responseBody };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prepares an FDC attestation request by calling the verifier's prepareRequest endpoint.
 * @see https://dev.flare.network/fdc/guides/hardhat/web-2-json
 */
export async function prepareAttestationRequest(
  verifierUrl: string,
  apiKey: string,
  attestationTypeBase: string,
  sourceIdBase: string,
  requestBody: Record<string, unknown>
): Promise<{ abiEncodedRequest: string; [key: string]: unknown }> {
  console.log("Url:", verifierUrl, "\n");
  const attestationType = toHex(attestationTypeBase, { size: 32 }) as `0x${string}`;
  const sourceId = toHex(sourceIdBase, { size: 32 }) as `0x${string}`;

  const request = {
    attestationType,
    sourceId,
    requestBody,
  };
  console.log("Prepared request:\n", request, "\n");

  const { statusCode, body } = await postJson(verifierUrl, request, { "X-API-KEY": apiKey });

  if (statusCode !== 200) {
    throw new Error(`Response status is not OK, status ${statusCode}\n`);
  }
  console.log("Response status is OK\n");

  const data = JSON.parse(body) as { abiEncodedRequest?: string; status?: string; errorMessage?: string };
  if (data.status && !data.status.startsWith("OK") && data.status !== "VALID") {
    const detail = data.errorMessage ? ` (${data.errorMessage})` : "";
    throw new Error(`Verifier rejected request: ${data.status}${detail}. Response: ${body}`);
  }
  if (data.abiEncodedRequest === undefined) {
    throw new Error(`Verifier response missing abiEncodedRequest. Body: ${body}`);
  }
  return data as { abiEncodedRequest: string; [key: string]: unknown };
}

/**
 * Submits an FDC attestation request on-chain and returns the voting round id.
 */
export async function submitAttestationRequest(abiEncodedRequest: `0x${string}`): Promise<number> {
  const fdcHubAddress = await getContractAddressByName("FdcHub");
  const feeConfigAddress = await publicClient.readContract({
    address: fdcHubAddress,
    abi: coston2.iFdcHubAbi,
    functionName: "fdcRequestFeeConfigurations",
    args: [],
  });
  const requestFee = await publicClient.readContract({
    address: feeConfigAddress,
    abi: coston2.iFdcRequestFeeConfigurationsAbi,
    functionName: "getRequestFee",
    args: [abiEncodedRequest],
  });

  const hash = await walletClient.writeContract({
    account,
    address: fdcHubAddress,
    abi: coston2.iFdcHubAbi,
    functionName: "requestAttestation",
    args: [abiEncodedRequest],
    value: requestFee,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const blockTimestamp = BigInt(block.timestamp);

  const flareSystemsManagerAddress = await getContractAddressByName("FlareSystemsManager");
  const [firstVotingRoundStartTs, votingEpochDurationSeconds] = await Promise.all([
    publicClient.readContract({
      address: flareSystemsManagerAddress,
      abi: coston2.iFlareSystemsManagerAbi,
      functionName: "firstVotingRoundStartTs",
      args: [],
    }),
    publicClient.readContract({
      address: flareSystemsManagerAddress,
      abi: coston2.iFlareSystemsManagerAbi,
      functionName: "votingEpochDurationSeconds",
      args: [],
    }),
  ]);

  const roundId = Number((blockTimestamp - firstVotingRoundStartTs) / votingEpochDurationSeconds);
  console.log("FDC attestation submitted. Round id:", roundId);
  return roundId;
}

/**
 * Waits for the FDC voting round to finalize, then fetches the proof from the DA layer.
 */
export async function retrieveDataAndProof(abiEncodedRequest: string, roundId: number): Promise<IWeb2JsonProof> {
  const daLayerProofUrl =
    (process.env.COSTON2_DA_LAYER_URL ?? "https://ctn2-data-availability.flare.network").replace(/\/$/, "") +
    "/api/v1/fdc/proof-by-request-round-raw";
  const relayAddress = await getContractAddressByName("Relay");
  const fdcVerificationAddress = await getContractAddressByName("FdcVerification");
  const protocolId = await publicClient.readContract({
    address: fdcVerificationAddress,
    abi: coston2.iFdcVerificationAbi,
    functionName: "fdcProtocolId",
    args: [],
  });

  console.log("Waiting for FDC round to finalize...");
  while (true) {
    const finalized = await publicClient.readContract({
      address: relayAddress,
      abi: coston2.iRelayAbi,
      functionName: "isFinalized",
      args: [BigInt(protocolId), BigInt(roundId)],
    });
    if (finalized) break;
    await sleep(POLL_INTERVAL_MS);
  }
  console.log("Round finalized.\n");

  const request = { votingRoundId: roundId, requestBytes: abiEncodedRequest };
  console.log("Request:", request, "\n");
  await sleep(DA_LAYER_POLL_MS);

  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    const { body } = await postJson(daLayerProofUrl, request);
    console.log("Body:", body, "\n");
    const raw = JSON.parse(body) as { response_hex?: string; proof?: unknown };
    if (raw.response_hex !== undefined) {
      const web2JsonResponse = decodeWeb2JsonResponse(raw.response_hex as `0x${string}`);
      const web2JsonProof: Web2JsonProof = {
        merkleProof: (raw.proof ?? []) as readonly `0x${string}`[],
        data: web2JsonResponse,
      };
      return { merkleProof: raw.proof ?? [], data: web2JsonResponse } as IWeb2JsonProof;
    }
    await sleep(DA_LAYER_POLL_MS);
  }
  throw new Error(`Failed to retrieve FDC data and proof after ${RETRY_ATTEMPTS} attempts`);
}

/**
 * Retrieves data and proof with retries (as in flare-hardhat-starter).
 */
export async function retrieveDataAndProofWithRetry(
  abiEncodedRequest: string,
  roundId: number,
  attempts: number = RETRY_ATTEMPTS
): Promise<IWeb2JsonProof> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await retrieveDataAndProof(abiEncodedRequest, roundId);
    } catch (e) {
      console.error(e, "\nRemaining attempts:", attempts - i - 1);
      await sleep(RETRY_SLEEP_MS);
    }
  }
  throw new Error(`Failed to retrieve FDC data and proof after ${attempts} attempts`);
}

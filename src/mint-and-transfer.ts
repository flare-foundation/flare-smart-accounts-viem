import { Client, dropsToXrp, Wallet } from "xrpl";
import { FXRPCollateralReservationInstruction } from "@flarenetwork/smart-accounts-encoder";
import { sendXrplPayment } from "./utils";
import { coston2 } from "test-periphery-artifacts-wagmi-types";
import { publicClient } from "./client";
import type { Log } from "viem";

const masterAccountControllerAddress = "0x3ab31E2d943d1E8F47B275605E50Ff107f2F8393";
const operatorXrplAddress = "rEyj8nsHLdgt79KJWzXR5BgF7ZbaohbXwq";

// TODO: (Nik) Get address from the FlareContractRegistry
const assetManagerFXRPAddress = "0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA";

const personalAccountAddress = "0x8c8BaeEffF5CA82eC2F5C4f81080e0B82e2E88BC";

async function reserveCollateral({
  collateralReservationInstruction,
  xrplClient,
  xrplWallet,
}: {
  collateralReservationInstruction: FXRPCollateralReservationInstruction;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const collateralReservationTransaction = await sendXrplPayment({
    destination: operatorXrplAddress,
    amount: 1,
    memos: [{ Memo: { MemoData: collateralReservationInstruction.encode().slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log("collateral reservation transaction hash:", collateralReservationTransaction.result.hash, "\n");

  let collateralReservationEvent: Log | undefined;
  let collateralReservationEventFound = false;

  // TODO:(Nik) CollateralReserved event
  const unwatchCollateralReserved = publicClient.watchContractEvent({
    address: assetManagerFXRPAddress,
    abi: coston2.iAssetManagerAbi,
    eventName: "CollateralReserved",
    onLogs: (logs) => {
      for (const log of logs) {
        collateralReservationEvent = log;
        if (log.args.minter !== personalAccountAddress) {
          continue;
        }
        console.log("CollateralReserved event:", log, "\n");
        collateralReservationEventFound = true;
        break;
      }
    },
  });

  console.log("Waiting for CollateralReserved event...");
  while (!collateralReservationEventFound) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  unwatchCollateralReserved();

  return collateralReservationEvent;
}

async function sendMintPayment({
  collateralReservationEvent,
  xrplClient,
  xrplWallet,
}: {
  collateralReservationEvent: Log;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const valueUBA = collateralReservationEvent.args.valueUBA;
  const feeUBA = collateralReservationEvent.args.feeUBA;
  const paymentAddress = collateralReservationEvent.args.paymentAddress;
  const paymentReference = collateralReservationEvent.args.paymentReference;
  const collateralReservationId = collateralReservationEvent.args.collateralReservationId;

  console.log("valueUBA:", valueUBA, "\n");
  console.log("feeUBA:", feeUBA, "\n");
  console.log("paymentAddress:", paymentAddress, "\n");
  console.log("paymentReference:", paymentReference, "\n");
  console.log("collateralReservationId:", collateralReservationId, "\n");

  const mintTransaction = await sendXrplPayment({
    destination: paymentAddress,
    amount: dropsToXrp(valueUBA + feeUBA),
    memos: [{ Memo: { MemoData: paymentReference.slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log("mint transaction hash:", mintTransaction.result.hash, "\n");

  let mintingExecutedEvent: Log | undefined;
  let mintingExecutedEventFound = false;

  console.log("Waiting for MintingExecuted event...");
  const unwatchMintingExecuted = publicClient.watchContractEvent({
    address: assetManagerFXRPAddress,
    abi: coston2.iAssetManagerAbi,
    eventName: "MintingExecuted",
    onLogs: (logs) => {
      for (const log of logs) {
        if (log.args.collateralReservationId !== collateralReservationId) {
          continue;
        }
        console.log("MintingExecuted event:", log, "\n");
        mintingExecutedEvent = log;
        mintingExecutedEventFound = true;
        return;
      }
    },
  });

  while (!mintingExecutedEventFound) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  unwatchMintingExecuted();

  return mintingExecutedEvent;
}

async function main() {
  // TODO:(Nik) Get from the MasterAccountController contract

  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const collateralReservationData = {
    walletId: 0,
    value: 1,
    agentVaultId: 1,
  };

  const collateralReservationInstruction = new FXRPCollateralReservationInstruction(collateralReservationData);
  console.log("Encoded collateral reservation instruction:", collateralReservationInstruction.encode().slice(2), "\n");

  const collateralReservationEvent = await reserveCollateral({
    collateralReservationInstruction,
    xrplClient,
    xrplWallet,
  });
  console.log("CollateralReserved event:", collateralReservationEvent, "\n");

  if (typeof collateralReservationEvent === "undefined" || !collateralReservationEvent) {
    throw new Error("CollateralReserved event not found");
  }

  const mintingExecutedEvent = await sendMintPayment({
    collateralReservationEvent,
    xrplClient,
    xrplWallet,
  });
  console.log("MintingExecuted event:", mintingExecutedEvent, "\n");

  // TODO:(Nik) transfer
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

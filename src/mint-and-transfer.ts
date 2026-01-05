import { Client, dropsToXrp, Wallet } from "xrpl";
import { FXRPCollateralReservationInstruction, FXRPTransferInstruction } from "@flarenetwork/smart-accounts-encoder";
import { sendXrplPayment } from "./utils/xrpl";
import { coston2 } from "test-periphery-artifacts-wagmi-types";
import { publicClient } from "./utils/client";
import type { Address, Log } from "viem";
import type { Log } from "viem";
import { abi as fAssetsAbi } from "./abis/FAsset";
import { abi as iMasterAccountControllerAbi } from "./abis/IMasterAccountController";
import {
  getOperatorXrplAddress,
  getPersonalAccountAddress,
  MASTER_ACCOUNT_CONTROLLER_ADDRESS,
} from "./utils/smart-accounts";
import type { CollateralReservedEventType, FxrpTransferredEventType } from "./utils/event-types";
import { getContractAddressByName } from "./utils/flare-contract-registry";

const FXRP_ADDRESS = "0x0b6A3645c240605887a5532109323A3E12273dc7";

const recipientAddress = "0x1cdacde0c68e0a508ae85279375070a88554871b";

async function reserveCollateral({
  collateralReservationInstruction,
  personalAccountAddress,
  xrplClient,
  xrplWallet,
}: {
  collateralReservationInstruction: FXRPCollateralReservationInstruction;
  personalAccountAddress: string;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const operatorXrplAddress = await getOperatorXrplAddress();
  const collateralReservationTransaction = await sendXrplPayment({
    destination: operatorXrplAddress,
    amount: 1,
    memos: [{ Memo: { MemoData: collateralReservationInstruction.encode().slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log("collateral reservation transaction hash:", collateralReservationTransaction.result.hash, "\n");

  let collateralReservationEvent: CollateralReservedEventType | undefined;
  let collateralReservationEventFound = false;

  const assetManagerFXRPAddress = await getContractAddressByName("AssetManagerFXRP");

  // TODO:(Nik) CollateralReserved event
  const unwatchCollateralReserved = publicClient.watchContractEvent({
    address: assetManagerFXRPAddress,
    abi: coston2.iAssetManagerAbi,
    eventName: "CollateralReserved",
    onLogs: (logs) => {
      for (const log of logs) {
        collateralReservationEvent = log as CollateralReservedEventType;
        if (collateralReservationEvent.args.minter !== personalAccountAddress) {
          continue;
        }
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
  collateralReservationEvent: CollateralReservedEventType;
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

  const assetManagerFXRPAddress = await getContractAddressByName("AssetManagerFXRP");

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

async function transfer({
  transferInstruction,
  personalAccountAddress,
  xrplClient,
  xrplWallet,
}: {
  transferInstruction: FXRPTransferInstruction;
  personalAccountAddress: string;
  xrplClient: Client;
  xrplWallet: Wallet;
}) {
  const operatorXrplAddress = await getOperatorXrplAddress();
  const transferTransaction = await sendXrplPayment({
    destination: operatorXrplAddress,
    amount: 1,
    memos: [{ Memo: { MemoData: transferInstruction.encode().slice(2) } }],
    wallet: xrplWallet,
    client: xrplClient,
  });
  console.log("transfer transaction hash:", transferTransaction.result.hash, "\n");

  let fxrpTransferredEvent: FxrpTransferredEventType | undefined;
  let fxrpTransferredEventFound = false;

  // TODO:(Nik) CollateralReserved event
  const unwatchCollateralReserved = publicClient.watchContractEvent({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iMasterAccountControllerAbi,
    eventName: "FxrpTransferred",
    onLogs: (logs) => {
      for (const log of logs) {
        fxrpTransferredEvent = log as FxrpTransferredEventType;

        if (
          fxrpTransferredEvent.args.personalAccount !== personalAccountAddress &&
          fxrpTransferredEvent.args.to !== recipientAddress
        ) {
          continue;
        }
        fxrpTransferredEventFound = true;
        break;
      }
    },
  });

  console.log("Waiting for FxrpTransferred event...");
  while (!fxrpTransferredEventFound) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  unwatchCollateralReserved();

  return fxrpTransferredEvent;
}

async function logBalances(personalAccountAddress: string, recipientAddress: string) {
  const personalAccountFxrpBalance = await publicClient.readContract({
    address: FXRP_ADDRESS,
    abi: fAssetsAbi,
    functionName: "balanceOf",
    args: [personalAccountAddress],
  });
  console.log("Personal account FXRP balance:", personalAccountFxrpBalance, "\n");

  const recipientAddressFxrpBalance = await publicClient.readContract({
    address: FXRP_ADDRESS,
    abi: fAssetsAbi,
    functionName: "balanceOf",
    args: [recipientAddress],
  });
  console.log("Recipient address FXRP balance:", recipientAddressFxrpBalance, "\n");
}

async function main() {
  const collateralReservationData = {
    walletId: 0,
    value: 1,
    agentVaultId: 1,
  };

  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const personalAccountAddress = await getPersonalAccountAddress(xrplWallet.address);

  const collateralReservationInstruction = new FXRPCollateralReservationInstruction(collateralReservationData);
  console.log("Encoded collateral reservation instruction:", collateralReservationInstruction.encode().slice(2), "\n");

  const collateralReservationEvent = await reserveCollateral({
    collateralReservationInstruction,
    personalAccountAddress,
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

  const transferInstruction = new FXRPTransferInstruction({
    walletId: 0,
    value: 1,
    recipientAddress: recipientAddress.slice(2),
  });
  console.log("Encoded transfer instruction:", transferInstruction.encode(), "\n");

  await logBalances(personalAccountAddress, recipientAddress);

  await transfer({
    transferInstruction,
    personalAccountAddress,
    xrplClient,
    xrplWallet,
  });

  await logBalances(personalAccountAddress, recipientAddress);
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

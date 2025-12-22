import { Client, Wallet } from "xrpl";
import { FXRPCollateralReservationInstruction } from "@flarenetwork/smart-accounts-encoder";
import { sendXrplPayment } from "./utils";

async function main() {
    // TODO:(Nik) Get from the MasterAccountController contract
    // MasterAccountController address 0x3ab31E2d943d1E8F47B275605E50Ff107f2F8393
    const operatorXrplAddress = "rBNkSvAFebTRYB5ksRXbNtJAPa6NeVPbRj";

    const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL);
    const wallet = Wallet.fromSeed(process.env.XRPL_SEED);

    const collateralReservationData = {
        walletId: 0,
        value: 1,
        agentVaultId: 1,
    };

    const collateralReservationInstruction = new FXRPCollateralReservationInstruction(collateralReservationData);
    console.log("Encoded collateral reservation instruction:", collateralReservationInstruction.encode().slice(2));

    const collateralReservationTransaction = await sendXrplPayment({
        destination: operatorXrplAddress,
        amount: 1,
        memos: [{ Memo: { MemoData: collateralReservationInstruction.encode().slice(2) } }],
        wallet: wallet,
        client: xrplClient,
    });
    console.log("collateral reservation transaction hash:", collateralReservationTransaction.result.hash);

    // TODO:(Nik) CollateralReserved event

    // TODO:(Nik) Transfer
}

void main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

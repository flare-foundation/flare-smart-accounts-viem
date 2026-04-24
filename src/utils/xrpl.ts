import { Client, Wallet, xrpToDrops } from "xrpl";
import type { Memo } from "xrpl";

export type SendXrplPaymentInputType = {
  destination: string;
  amount: number;
  memos?: Memo[];
  destinationTag?: number;
  wallet: Wallet;
  client: Client;
};

export async function sendXrplPayment({
  destination,
  memos,
  destinationTag,
  amount,
  wallet,
  client,
}: SendXrplPaymentInputType) {
  await client.connect();

  const preparedTransaction = await client.autofill({
    TransactionType: "Payment",
    Account: wallet.address,
    Amount: xrpToDrops(amount),
    Destination: destination,
    ...(memos && memos.length > 0 ? { Memos: memos } : {}),
    ...(destinationTag !== undefined ? { DestinationTag: destinationTag } : {}),
  });

  const signedTransaction = wallet.sign(preparedTransaction);
  const transaction = await client.submitAndWait(signedTransaction.tx_blob);

  await client.disconnect();

  return transaction;
}

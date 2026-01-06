import type { Address, Log } from "viem";

type CollateralReservedEventArgsType = {
  args: {
    agentVault: Address;
    minter: Address;
    collateralReservationId: bigint;
    valueUBA: bigint;
    feeUBA: bigint;
    firstUnderlyingBlock: bigint;
    lastUnderlyingBlock: bigint;
    lastUnderlyingTimestamp: bigint;
    paymentAddress: string;
    paymentReference: string;
    executor: Address;
    executorFeeNatWei: bigint;
  };
};
export type CollateralReservedEventType = Log & CollateralReservedEventArgsType;

type FxrpTransferredEventArgsType = {
  args: {
    personalAccount: Address;
    to: Address;
    amount: bigint;
  };
};
export type FxrpTransferredEventType = Log & FxrpTransferredEventArgsType;

type DepositedEventArgsType = {
  args: {
    personalAccount: Address;
    vault: Address;
    amount: bigint;
    shares: bigint;
  };
};
export type DepositedEventType = Log & DepositedEventArgsType;

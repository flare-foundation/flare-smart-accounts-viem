import type { Log, AbiEvent, Address } from "viem";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import type { CustomInstruction } from "./smart-accounts";

// Helper type to extract event from ABI and create Log type
type EventLogType<TAbi extends readonly unknown[], TEventName extends string> = Log<
  bigint,
  number,
  false,
  Extract<TAbi[number], { type: "event"; name: TEventName }> & AbiEvent,
  true
>;

// Event log types derived from ABI
export type CollateralReservedEventType = EventLogType<typeof coston2.iAssetManagerAbi, "CollateralReserved">;

export type FxrpTransferredEventType = EventLogType<typeof coston2.iMasterAccountControllerAbi, "FXrpTransferred">;

export type DepositedEventType = EventLogType<typeof coston2.iMasterAccountControllerAbi, "Deposited">;

// TODO:(Nik) Import from library, when the library has been updated
type CustomInstructionExecutedArgsType = {
  args: {
    personalAccount: Address;
    callHash: `0x${string}`;
    customInstruction: readonly CustomInstruction[];
  };
};
export type CustomInstructionExecutedEventType = Log & CustomInstructionExecutedArgsType;

// TODO:(Nik) Import from library when the library has been updated.
// Also investigate DirectMintingExecutedToSmartAccount event (smart-account variant) and when each is emitted.
type DirectMintingExecutedArgsType = {
  args: {
    transactionId: `0x${string}`;
    targetAddress: Address;
    executor: Address;
    mintedAmountUBA: bigint;
    mintingFeeUBA: bigint;
    executorFeeUBA: bigint;
  };
};
export type DirectMintingExecutedEventType = Log & DirectMintingExecutedArgsType;

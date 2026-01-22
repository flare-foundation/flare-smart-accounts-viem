import type { Log, AbiEvent } from "viem";
import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";

// Helper type to extract event from ABI and create Log type
type EventLogType<
  TAbi extends readonly unknown[],
  TEventName extends string
> = Log<
  bigint,
  number,
  false,
  Extract<TAbi[number], { type: "event"; name: TEventName }> & AbiEvent,
  true
>;

// Event log types derived from ABI
export type CollateralReservedEventType = EventLogType<
  typeof coston2.iAssetManagerAbi,
  "CollateralReserved"
>;

export type FxrpTransferredEventType = EventLogType<
  typeof coston2.iMasterAccountControllerAbi,
  "FXrpTransferred"
>;

export type DepositedEventType = EventLogType<
  typeof coston2.iMasterAccountControllerAbi,
  "Deposited"
>;

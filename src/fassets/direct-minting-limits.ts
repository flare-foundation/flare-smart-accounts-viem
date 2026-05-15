import { dropsToXrp } from "xrpl";
import { getAssetManagerFXRPAddress } from "../utils/flare-contract-registry";
import {
  getAssetMintingGranularityUBA,
  getDirectMintingDailyLimitUBA,
  getDirectMintingDailyLimiterState,
  getDirectMintingHourlyLimitUBA,
  getDirectMintingHourlyLimiterState,
  getDirectMintingLargeMintingDelaySeconds,
  getDirectMintingLargeMintingThresholdUBA,
  getDirectMintingsUnblockUntilTimestamp,
} from "./settings";

// How the hourly/daily limits work (MintingRateLimiter.sol):
//
// Clock-aligned tumbling windows, NOT rolling. On initialize the window start
// is snapped to a multiple of windowSizeSeconds:
//   windowStartTimestamp = block.timestamp - block.timestamp % windowSizeSeconds
// With windowSizeSeconds = 3600 the hourly window aligns to UTC hour boundaries
// (00:00-01:00, 01:00-02:00, ...). The daily window (86400s) aligns to 00:00 UTC.
//
// On every write, _processElapsedWindows advances the window:
//   windowsElapsed         = (now - windowStartTimestamp) / windowSizeSeconds
//   mintedInCurrentWindow  = subOrZero(mintedInCurrentWindow, windowsElapsed * maxPerWindow)
//   windowStartTimestamp  += windowsElapsed * windowSizeSeconds
//
// Two consequences worth noting:
//   1. Unused capacity does NOT accumulate. subOrZero clamps at zero; an idle
//      hour does not give you 2x the cap next hour - you always get exactly
//      maxPerWindow per fresh window.
//   2. Over-cap mints are not rejected, they are delayed. allowedAt is set to
//      windowStartTimestamp + windowSize * mintedInCurrentWindow / maxPerWindow,
//      so overflow pushes into future windows and is drained hour-by-hour by
//      the subOrZero step.
//
// Reading on-chain state alone gives stale (windowStart, minted) values until
// the next write touches the limiter, so this script replays the slide
// off-chain to show the values as they would be right now.
const HOURLY_WINDOW_SECONDS = 3600n;
const DAILY_WINDOW_SECONDS = 86400n;

function formatUba(uba: bigint): string {
  return `${uba.toString()} UBA (${dropsToXrp(uba.toString())} XRP)`;
}

function formatTimestamp(secondsSinceEpoch: bigint, now: bigint): string {
  const iso = new Date(Number(secondsSinceEpoch) * 1000).toISOString();
  const delta = Number(secondsSinceEpoch - now);
  const relative = delta >= 0 ? `in ${delta}s` : `${-delta}s ago`;
  return `${iso} (${relative})`;
}

function bigintMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function computeWindowState({
  now,
  windowStartTimestamp,
  mintedInCurrentWindowUBA,
  limitUBA,
  windowSizeSeconds,
}: {
  now: bigint;
  windowStartTimestamp: bigint;
  mintedInCurrentWindowUBA: bigint;
  limitUBA: bigint;
  windowSizeSeconds: bigint;
}) {
  let effectiveStart = windowStartTimestamp;
  let usedUBA = mintedInCurrentWindowUBA;

  if (windowStartTimestamp > 0n && now >= windowStartTimestamp + windowSizeSeconds) {
    const windowsElapsed = (now - windowStartTimestamp) / windowSizeSeconds;
    effectiveStart = windowStartTimestamp + windowsElapsed * windowSizeSeconds;
    const drained = windowsElapsed * limitUBA;
    usedUBA = drained >= usedUBA ? 0n : usedUBA - drained;
  }

  const remainingUBA = limitUBA > usedUBA ? limitUBA - usedUBA : 0n;
  const nextResetAt = effectiveStart + windowSizeSeconds;

  return { effectiveStart, usedUBA, remainingUBA, nextResetAt };
}

function printWindow(
  label: string,
  opts: {
    limitUBA: bigint;
    usedUBA: bigint;
    remainingUBA: bigint;
    effectiveStart: bigint;
    nextResetAt: bigint;
    now: bigint;
  }
) {
  const { limitUBA, usedUBA, remainingUBA, effectiveStart, nextResetAt, now } = opts;
  const usedPct = limitUBA === 0n ? 0 : Number((usedUBA * 10000n) / limitUBA) / 100;
  console.log(`=== ${label} ===`);
  console.log("Limit:           ", formatUba(limitUBA));
  console.log("Used:            ", formatUba(usedUBA), `(${usedPct.toFixed(2)}%)`);
  console.log("Remaining:       ", formatUba(remainingUBA));
  console.log("Window started:  ", formatTimestamp(effectiveStart, now));
  console.log("Window resets at:", formatTimestamp(nextResetAt, now));
  console.log();
}

async function main() {
  const assetManagerAddress = await getAssetManagerFXRPAddress();
  console.log("AssetManagerFXRP address:", assetManagerAddress, "\n");

  const [
    amgGranularityUBA,
    hourlyLimitUBA,
    dailyLimitUBA,
    hourlyState,
    dailyState,
    unblockUntilTimestamp,
    largeThresholdUBA,
    largeDelaySeconds,
  ]: [bigint, bigint, bigint, readonly [bigint, bigint], readonly [bigint, bigint], bigint, bigint, bigint] =
    await Promise.all([
      getAssetMintingGranularityUBA(assetManagerAddress),
      getDirectMintingHourlyLimitUBA(assetManagerAddress),
      getDirectMintingDailyLimitUBA(assetManagerAddress),
      getDirectMintingHourlyLimiterState(assetManagerAddress),
      getDirectMintingDailyLimiterState(assetManagerAddress),
      getDirectMintingsUnblockUntilTimestamp(assetManagerAddress),
      getDirectMintingLargeMintingThresholdUBA(assetManagerAddress),
      getDirectMintingLargeMintingDelaySeconds(assetManagerAddress),
    ]);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const limiterDisabled = unblockUntilTimestamp > now;

  console.log("Windows are clock-aligned tumbling: hourly snaps to UTC hour boundaries, daily to 00:00 UTC.");
  console.log("Unused capacity does not roll over; over-cap mints are delayed, not rejected.\n");

  // Limiter state is returned as raw AMG (uint64); convert to UBA via amgGranularityUBA
  // before passing into the window math.
  const computeAndPrint = (label: string, limitUBA: bigint, state: readonly [bigint, bigint], sizeSeconds: bigint) => {
    const [windowStart, mintedAmg] = state;
    const result = computeWindowState({
      now,
      windowStartTimestamp: windowStart,
      mintedInCurrentWindowUBA: mintedAmg * amgGranularityUBA,
      limitUBA,
      windowSizeSeconds: sizeSeconds,
    });
    printWindow(label, { ...result, limitUBA, now });
    return result;
  };

  const hourly = computeAndPrint("Hourly window", hourlyLimitUBA, hourlyState, HOURLY_WINDOW_SECONDS);
  const daily = computeAndPrint("Daily window", dailyLimitUBA, dailyState, DAILY_WINDOW_SECONDS);

  console.log("=== Other flags ===");
  if (limiterDisabled) {
    console.log(
      "Limiter DISABLED until:",
      formatTimestamp(unblockUntilTimestamp, now),
      "— hourly/daily caps are not enforced right now."
    );
  } else {
    console.log("Limiter active (unblockUntilTimestamp =", unblockUntilTimestamp.toString() + ")");
  }
  console.log("Large minting threshold:", formatUba(largeThresholdUBA));
  console.log("Large minting delay:    ", `${largeDelaySeconds.toString()}s`);
  console.log();

  // Pre-flight gate: how much can a single mint safely request right now?
  const hourlyHeadroomUBA = limiterDisabled ? hourlyLimitUBA : hourly.remainingUBA;
  const dailyHeadroomUBA = limiterDisabled ? dailyLimitUBA : daily.remainingUBA;
  const safeRemainingUBA = bigintMin(hourlyHeadroomUBA, dailyHeadroomUBA);
  console.log("Maximum single mint that fits both windows:", formatUba(safeRemainingUBA));
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { coston2 } from "@flarenetwork/flare-wagmi-periphery-package";
import { dropsToXrp } from "xrpl";
import { publicClient } from "../utils/client";
import { getContractAddressByName } from "../utils/flare-contract-registry";

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
  const sign = delta >= 0 ? "in" : "ago";
  return `${iso} (${sign} ${Math.abs(delta)}s)`;
}

// MintingRateLimiter only rolls the window forward on writes, so a pure read
// can return a stale (windowStart, minted) pair. Replay the slide off-chain.
function computeWindowState({
  now,
  windowStartTimestamp,
  mintedInCurrentWindow,
  maxPerWindowAmg,
  windowSizeSeconds,
}: {
  now: bigint;
  windowStartTimestamp: bigint;
  mintedInCurrentWindow: bigint;
  maxPerWindowAmg: bigint;
  windowSizeSeconds: bigint;
}) {
  let effectiveStart = windowStartTimestamp;
  let effectiveMinted = mintedInCurrentWindow;

  if (windowStartTimestamp > 0n && now >= windowStartTimestamp + windowSizeSeconds) {
    const windowsElapsed = (now - windowStartTimestamp) / windowSizeSeconds;
    effectiveStart = windowStartTimestamp + windowsElapsed * windowSizeSeconds;
    const drained = windowsElapsed * maxPerWindowAmg;
    effectiveMinted = drained >= effectiveMinted ? 0n : effectiveMinted - drained;
  }

  const remainingAmg = maxPerWindowAmg > effectiveMinted ? maxPerWindowAmg - effectiveMinted : 0n;
  const nextResetAt = effectiveStart + windowSizeSeconds;

  return { effectiveStart, effectiveMinted, remainingAmg, nextResetAt };
}

function printWindow(label: string, opts: {
  limitUBA: bigint;
  usedUBA: bigint;
  remainingUBA: bigint;
  effectiveStart: bigint;
  nextResetAt: bigint;
  now: bigint;
}) {
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
  const assetManagerAddress = await getContractAddressByName("AssetManagerFXRP");
  console.log("AssetManagerFXRP address:", assetManagerAddress, "\n");

  const settings = await publicClient.readContract({
    address: assetManagerAddress,
    abi: coston2.iAssetManagerAbi,
    functionName: "getSettings",
  });
  const amgGranularityUBA = BigInt(settings.assetMintingGranularityUBA);

  const [
    hourlyLimitUBA,
    dailyLimitUBA,
    hourlyState,
    dailyState,
    unblockUntilTimestamp,
    largeThresholdUBA,
    largeDelaySeconds,
  ] = await Promise.all([
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingHourlyLimitUBA",
    }),
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingDailyLimitUBA",
    }),
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingHourlyLimiterState",
    }),
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingDailyLimiterState",
    }),
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingsUnblockUntilTimestamp",
    }),
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingLargeMintingThresholdUBA",
    }),
    publicClient.readContract({
      address: assetManagerAddress,
      abi: coston2.iDirectMintingSettingsAbi,
      functionName: "getDirectMintingLargeMintingDelaySeconds",
    }),
  ]);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const limiterDisabled = unblockUntilTimestamp > now;

  // Limiter state is returned as raw AMG (uint64), unlike the *LimitUBA getters.
  // Convert via assetMintingGranularityUBA before comparing or displaying.
  const [hourlyWindowStart, hourlyMintedAmg] = hourlyState;
  const [dailyWindowStart, dailyMintedAmg] = dailyState;

  const hourlyMaxAmg = amgGranularityUBA === 0n ? 0n : hourlyLimitUBA / amgGranularityUBA;
  const dailyMaxAmg = amgGranularityUBA === 0n ? 0n : dailyLimitUBA / amgGranularityUBA;

  const hourly = computeWindowState({
    now,
    windowStartTimestamp: hourlyWindowStart,
    mintedInCurrentWindow: hourlyMintedAmg,
    maxPerWindowAmg: hourlyMaxAmg,
    windowSizeSeconds: HOURLY_WINDOW_SECONDS,
  });
  const daily = computeWindowState({
    now,
    windowStartTimestamp: dailyWindowStart,
    mintedInCurrentWindow: dailyMintedAmg,
    maxPerWindowAmg: dailyMaxAmg,
    windowSizeSeconds: DAILY_WINDOW_SECONDS,
  });

  console.log(
    "Windows are clock-aligned tumbling: hourly snaps to UTC hour boundaries, daily to 00:00 UTC.",
  );
  console.log("Unused capacity does not roll over; over-cap mints are delayed, not rejected.\n");

  printWindow("Hourly window", {
    limitUBA: hourlyLimitUBA,
    usedUBA: hourly.effectiveMinted * amgGranularityUBA,
    remainingUBA: hourly.remainingAmg * amgGranularityUBA,
    effectiveStart: hourly.effectiveStart,
    nextResetAt: hourly.nextResetAt,
    now,
  });

  printWindow("Daily window", {
    limitUBA: dailyLimitUBA,
    usedUBA: daily.effectiveMinted * amgGranularityUBA,
    remainingUBA: daily.remainingAmg * amgGranularityUBA,
    effectiveStart: daily.effectiveStart,
    nextResetAt: daily.nextResetAt,
    now,
  });

  console.log("=== Other flags ===");
  if (limiterDisabled) {
    console.log(
      "Limiter DISABLED until:",
      formatTimestamp(unblockUntilTimestamp, now),
      "— hourly/daily caps are not enforced right now.",
    );
  } else {
    console.log(
      "Limiter active (unblockUntilTimestamp =",
      unblockUntilTimestamp.toString() + ")",
    );
  }
  console.log("Large minting threshold:", formatUba(largeThresholdUBA));
  console.log("Large minting delay:    ", `${largeDelaySeconds.toString()}s`);
  console.log();

  // Pre-flight gate: how much can a single mint safely request right now?
  const safeRemainingUBA = limiterDisabled
    ? hourlyLimitUBA > dailyLimitUBA
      ? dailyLimitUBA
      : hourlyLimitUBA
    : (() => {
        const hourlyRemainingUBA = hourly.remainingAmg * amgGranularityUBA;
        const dailyRemainingUBA = daily.remainingAmg * amgGranularityUBA;
        return hourlyRemainingUBA < dailyRemainingUBA ? hourlyRemainingUBA : dailyRemainingUBA;
      })();
  console.log("Maximum single mint that fits both windows:", formatUba(safeRemainingUBA));
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

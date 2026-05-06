---
name: morpho-vault
description: How to interact with Morpho (Vaults V2 and Morpho Blue lending markets) from a viem/TypeScript script. Use when depositing collateral, borrowing, computing max-borrow, or reading positions.
---

## 1. Vaults V2 vs. Morpho Blue

These are different contracts. Picking the wrong one is the most common mistake.

- **Morpho Vaults V2** = ERC4626 yield vaults (one asset per vault). Functions: `deposit(assets, onBehalf)`, `mint`, `withdraw`, `redeem`. **No `borrow` function.** `maxDeposit/Mint/Withdraw/Redeem` always return 0 by design — intentional non-conformance to ERC4626, because gate calls are not guaranteed revert-free, so the spec returns a gross underestimate. Vaults V2 allocate user deposits to adapters which deploy the asset to underlying lending markets.
- **Morpho Blue** = the core lending primitive. Each market is identified by `MarketParams { loanToken, collateralToken, oracle, irm, lltv }`. `supplyCollateral` and `borrow` live here. Single contract, many markets.
- A user who wants to "deposit FXRP collateral and borrow USDT0" calls **Morpho Blue**, not a Vault V2.

## 2. Morpho Blue: function signatures

```solidity
struct MarketParams {
  address loanToken;
  address collateralToken;
  address oracle;
  address irm;
  uint256 lltv;
}

type Id is bytes32;

function supplyCollateral(
  MarketParams memory marketParams,
  uint256 assets,
  address onBehalf,
  bytes memory data
) external;

function borrow(
  MarketParams memory marketParams,
  uint256 assets,
  uint256 shares,
  address onBehalf,
  address receiver
) external returns (uint256 assetsBorrowed, uint256 sharesBorrowed);

function repay(
  MarketParams memory marketParams,
  uint256 assets,
  uint256 shares,
  address onBehalf,
  bytes memory data
) external returns (uint256 assetsRepaid, uint256 sharesRepaid);

function withdrawCollateral(
  MarketParams memory marketParams,
  uint256 assets,
  address onBehalf,
  address receiver
) external;

function position(
  Id id,
  address user
) external view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral);

function market(
  Id id
)
  external
  view
  returns (
    uint128 totalSupplyAssets,
    uint128 totalSupplyShares,
    uint128 totalBorrowAssets,
    uint128 totalBorrowShares,
    uint128 lastUpdate,
    uint128 fee
  );
```

Notes:

- For `borrow` / `repay`, pass exactly one of `assets` or `shares` (the other = 0).
- `data` bytes parameter on `supplyCollateral` / `repay` is for callbacks; pass `"0x"` if not using.
- The collateral token must be approved to Morpho Blue before `supplyCollateral` (Morpho uses `transferFrom`).

## 3. Market `Id` derivation

`Id = keccak256(abi.encode(marketParams))`. In viem:

```ts
import { keccak256, encodeAbiParameters } from "viem";

const id = keccak256(
  encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
    ],
    [marketParams]
  )
);
```

## 4. Computing max borrow

There is no single `maxBorrow` view on Morpho Blue. The standard formula derived from `_isHealthy`:

```
collateralValue = collateral * oraclePrice / ORACLE_PRICE_SCALE     // ORACLE_PRICE_SCALE = 1e36
maxBorrowAssets = collateralValue * lltv / WAD                       // WAD = 1e18
remainingBorrow = maxBorrowAssets - currentBorrowAssets
```

In one line of TS (rounded down, like Morpho's `mulDivDown`):

```ts
const maxBorrowAssets = (collateral * oraclePrice * lltv) / (10n ** 36n * 10n ** 18n);
```

Apply a small safety margin (~1%) to avoid reverts from interest accrual / rounding:

```ts
const borrowAssets = (maxBorrowAssets * 99n) / 100n;
```

`oraclePrice` comes from the market's oracle contract. The minimal interface is:

```solidity
function price() external view returns (uint256);
```

Most Morpho-compatible oracles (`IOracle`) expose this. It returns the price of 1 unit of `collateralToken` quoted in `loanToken`, scaled by `ORACLE_PRICE_SCALE = 10^(36 + loanTokenDecimals - collateralTokenDecimals)`. That scaling is what makes `oraclePrice / 1e36` give the right collateral-to-loan unit conversion when collateral is in wei of `collateralToken` and the result is in wei of `loanToken`.

## 5. Vaults V2: ERC4626 entries

Only relevant for "earn"-side examples; not for borrowing.

- `deposit(uint256 assets, address onBehalf) → uint256 shares` — `onBehalf` receives the shares.
- `redeem(uint256 shares, address receiver, address onBehalf) → uint256 assets`.
- `previewDeposit(assets)` / `previewRedeem(shares)` — exchange-rate previews.
- `asset()` — view returning the underlying ERC20.
- The user must approve the vault on `asset()` before depositing.
- `maxDeposit` / `maxMint` / `maxWithdraw` / `maxRedeem` always return 0 — **do not** rely on them; size deposits/withdrawals from inputs or `previewDeposit`.

## 6. Common integration shape

A typical "supply collateral + borrow max" call sequence (for a smart-account batch or a multicall):

```ts
const calls = [
  {
    to: collateralToken,
    data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [morphoBlue, collateralAmount] }),
  },
  {
    to: morphoBlue,
    data: encodeFunctionData({
      abi: morphoBlueAbi,
      functionName: "supplyCollateral",
      args: [marketParams, collateralAmount, onBehalf, "0x"],
    }),
  },
  {
    to: morphoBlue,
    data: encodeFunctionData({
      abi: morphoBlueAbi,
      functionName: "borrow",
      args: [marketParams, borrowAssets, 0n, onBehalf, receiver],
    }),
  },
];
```

## 7. Pitfalls

- Forgetting `approve` before `supplyCollateral` (Morpho Blue uses `transferFrom`).
- Passing both `assets` and `shares` non-zero on `borrow` / `repay` (reverts).
- Borrowing exactly `maxBorrowAssets` — interest accrual within the same block can cause `Insufficient collateral` reverts. Always leave headroom.
- Using a Vault V2 address where a Morpho Blue address is expected — the Vault V2 has no `borrow` selector, the call will revert.
- Treating `maxDeposit` / `maxWithdraw` as real limits — they return 0.

## 8. Sources

- https://docs.morpho.org/build/borrow/get-started
- https://docs.morpho.org/get-started/resources/contracts/morpho
- https://docs.morpho.org/get-started/resources/contracts/morpho-vaults-v2
- https://github.com/morpho-org/morpho-blue

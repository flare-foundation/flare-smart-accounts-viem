---
name: flare-smart-accounts
description: How to use Flare smart accounts with the new direct-minting custom-instructions flow from a viem/xrpl TypeScript script. Use when sending an XRPL Payment whose memo executes a batch of EVM calls on the user's personal smart account on Flare Coston2, optionally minting FXRP in the same transaction.
---

## 1. Mental model

Each XRPL address controls a unique EVM smart account ("personal account") on Flare Coston2. To execute EVM calls on it, the user sends an XRPL Payment to a designated direct-minting operator address. The Payment's memo encodes a UserOp containing one or more `Call`s; the Payment's amount covers FXRP minting fees and/or just the executor fee. An operator presents proof of the Payment to `MasterAccountController`, which executes the UserOp on the personal account. If the Payment's memo includes a non-zero net-mint amount, FXRP is minted directly to the personal account before the calls run, so the calls can use the freshly-minted FXRP.

## 2. Core helpers

All in `src/utils/smart-accounts.ts` unless noted.

- `getPersonalAccountAddress(xrplAddress: string): Promise<Address>` — `src/utils/smart-accounts.ts:24-33`. Reads `MasterAccountController.getPersonalAccount(xrplAddress)`.
- `Call = { target: Address; value: bigint; data: \`0x${string}\` }`—`src/utils/smart-accounts.ts:116-120`. One EVM call inside a UserOp.
- `getNonce(personalAccount: Address): Promise<bigint>` — `src/utils/smart-accounts.ts:139-146`. Reads the personal account's UserOp nonce; called internally by `sendMemoFieldInstruction`.
- `encodeExecuteUserOpMemo({ calls, walletId, executorFeeUBA, sender, nonce }): \`0x${string}\``—`src/utils/smart-accounts.ts:148-188`. Builds the memo: 10-byte header `0xFF | walletId(1B) | executorFeeUBA(8B big-endian)`followed by ABI-encoded`PackedUserOperation`whose`callData`is`IPersonalAccount.executeUserOp(Call[])`. Used internally by `sendMemoFieldInstruction`with`walletId: 0`and`executorFeeUBA: 0n` (`src/utils/smart-accounts.ts:210-216`).
- `sendMemoFieldInstruction({ label, calls, amountXrp, personalAccount, xrplClient, xrplWallet }): Promise<UserOperationExecutedEventType>` — `src/utils/smart-accounts.ts:190-233`. Sends one XRPL Payment carrying one UserOp memo to the FXRP direct-minting payment address (`getDirectMintingPaymentAddress(AssetManagerFXRP)`, `src/utils/smart-accounts.ts:218-219`); blocks until the matching `UserOperationExecuted` event fires.
- `waitForUserOperationExecuted({ personalAccount, nonce })` — `src/utils/smart-accounts.ts:235-265`. Watches `MasterAccountController` for the matching event; called internally — do not call directly.
- `computeDirectMintingPaymentAmountXrp({ netMintAmountXrp: number }): Promise<number>` — `src/utils/fassets.ts:40-70`. Reads `getDirectMintingExecutorFeeUBA`, `getDirectMintingFeeBIPS`, `getDirectMintingMinimumFeeUBA` from `AssetManagerFXRP`, then returns total XRP = `netMintUBA + max(netMintUBA*feeBIPS/10000, minimumFeeUBA) + executorFeeUBA`. Pass `0` for fees-only ("memo-only") follow-up batches.
- `getFxrpBalance(address)` / `getFxrpDecimals()` — `src/utils/fassets.ts:8-28`. Standard ERC20 reads against the FXRP token.
- `sendXrplPayment({ destination, amount, memos?, destinationTag?, wallet, client })` — `src/utils/xrpl.ts:13-38`. Thin xrpl.js wrapper: `client.connect()` → `autofill` → `wallet.sign` → `submitAndWait` → `disconnect`. Called internally by `sendMemoFieldInstruction`.

Viem clients live in `src/utils/client.ts`: `publicClient` and `walletClient` target `flareTestnet` (Coston2); `account = privateKeyToAccount(process.env.PRIVATE_KEY)`.

## 3. The 1024-byte memo limit

XRPL caps each memo at ~1024 bytes. The encoded UserOp memo is `[10-byte header | abi.encoded PackedUserOperation]` where the UserOp's `callData` is the ABI-encoded `IPersonalAccount.executeUserOp(Call[])` (see `src/utils/smart-accounts.ts:148-188`). Strings, large arrays, and many calls all eat into the limit.

**Solution: split into multiple `sendMemoFieldInstruction` calls.** First batch can mint FXRP (`amountXrp = paymentAmountXrp`); follow-up batches use `amountXrp = memoOnlyAmountXrp`. Both `src/custom-instructions.ts` and `src/layer-zero/cross-chain-mint.ts` use this pattern:

- `src/custom-instructions.ts:23-24` notes: "XRPL caps each memo at ~1024 bytes. `pinNotice` has a string arg that pushes the 3-call version over the limit, so it goes in its own batch."
- `src/custom-instructions.ts:69-85` — first batch sends `paymentAmountXrp`, second sends `memoOnlyAmountXrp`.
- `src/layer-zero/cross-chain-mint.ts:98-100` notes: "Even with the thin shim calldata, a combined approve+bridge UserOperation still overflows (~1098 bytes), so split into two memo-field instructions."
- `src/layer-zero/cross-chain-mint.ts:125-143` — same two-batch pattern.

## 4. Within-batch execution model

The calls inside one `sendMemoFieldInstruction` run **sequentially within a single transaction** on the personal account (one ABI-encoded `executeUserOp(Call[])` invocation, `src/utils/smart-accounts.ts:161-165`). If `netMintAmountXrp > 0`, FXRP is minted to the personal account **before** that transaction's calls execute. Therefore: **freshly minted FXRP is usable in the very same `Call[]`** — you can mint, approve, and `supplyCollateral` in one batch, provided the encoded memo fits under 1024 bytes.

The reason `cross-chain-mint.ts` splits its mint and its bridge call across two batches is **memo size, not balance ordering** — see the comment at `src/layer-zero/cross-chain-mint.ts:98-100` ("a combined approve+bridge UserOperation still overflows (~1098 bytes), so split into two memo-field instructions").

## 5. Skeleton

```ts
import { encodeFunctionData } from "viem";
import { Client, Wallet } from "xrpl";
import { abi as erc20Abi } from "./abis/ERC20";
import { getPersonalAccountAddress, sendMemoFieldInstruction, type Call } from "./utils/smart-accounts";
import { computeDirectMintingPaymentAmountXrp } from "./utils/fassets";

async function main() {
  const fxrpMintAmount = 10;

  const xrplClient = new Client(process.env.XRPL_TESTNET_RPC_URL!);
  const xrplWallet = Wallet.fromSeed(process.env.XRPL_SEED!);

  const [personalAccount, paymentAmountXrp] = await Promise.all([
    getPersonalAccountAddress(xrplWallet.address),
    computeDirectMintingPaymentAmountXrp({ netMintAmountXrp: fxrpMintAmount }),
  ]);

  const calls: Call[] = [
    {
      target: SOME_TOKEN,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [SOME_SPENDER, AMOUNT],
      }),
    },
    // ...more calls
  ];

  await sendMemoFieldInstruction({
    label: "my-batch",
    calls,
    amountXrp: paymentAmountXrp,
    personalAccount,
    xrplClient,
    xrplWallet,
  });
}

void main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

For follow-up batches with no minting, replace `paymentAmountXrp` with a separately computed `memoOnlyAmountXrp = await computeDirectMintingPaymentAmountXrp({ netMintAmountXrp: 0 })` and pass that as `amountXrp` (pattern: `src/custom-instructions.ts:60-85`, `src/layer-zero/cross-chain-mint.ts:67-143`).

## 6. FXRP token essentials

- FXRP address on Coston2 is `0x0b6A3645c240605887a5532109323A3E12273dc7` — used as a constant in `src/flare-lending/deposit-fxrp-borrow-mpt.ts:25`. For dynamic lookup use `getFxrpAddress` from `src/utils/flare-contract-registry.ts:26-33` (reads `AssetManagerFXRP.fAsset()`).
- FXRP has 18 decimals (XRPL drops are 6-decimal, but the FAsset wrapper is 18-decimal). 1 XRP minted via direct minting becomes `1e18` FXRP wei; computing via `xrpToDrops(...)` gives `1e6` UBA but the on-chain FXRP balance is `1e18` wei. See `src/layer-zero/cross-chain-mint.ts:77` for the `xrpToDrops` → `BigInt` pattern when the bridge expects UBA-scaled amounts; for ordinary ERC20 calls on FXRP itself, use 18-decimal amounts (e.g. `parseUnits("10", 18)` or `10n * 10n ** 18n`).
- Repo style for amounts: `BigInt(0)` or `0n` for `Call.value`; `123n` for arithmetic; `parseUnits` / explicit `10n ** 18n` for token amounts. See `src/custom-instructions.ts:25-43` and `src/layer-zero/cross-chain-mint.ts:101-123`.

## 7. Required environment variables

For any direct-minting script:

- `PRIVATE_KEY` — viem signer; consumed by `src/utils/client.ts:15`. Needed because helpers reach into `publicClient`/`walletClient`.
- `XRPL_SEED` — XRPL wallet seed, used as `Wallet.fromSeed(process.env.XRPL_SEED!)` to sign the Payment.
- `XRPL_TESTNET_RPC_URL` — XRPL endpoint, used as `new Client(process.env.XRPL_TESTNET_RPC_URL!)`.

The personal account also needs C2FLR for gas — note in `src/custom-instructions.ts:9` and `src/layer-zero/cross-chain-mint.ts:46`: "you first need to faucet C2FLR to your personal account address."

## 8. Pitfalls

- Forgetting to pass `paymentAmountXrp` (with minting) on the _first_ batch and `memoOnlyAmountXrp` on subsequent batches — wrong amount → operator may not pay enough fees, or net-mint amount is wrong, and the instruction fails.
- Building a `Call[]` whose ABI-encoded UserOp + 10-byte header exceeds 1024 bytes — split into multiple `sendMemoFieldInstruction` invocations.
- `Call.value` is in wei (`bigint`). Always set to `0n` unless calling a payable function with native FLR (e.g. LayerZero native fee at `src/layer-zero/cross-chain-mint.ts:116`).
- Hardcoding `walletId` other than the default `0` — `sendMemoFieldInstruction` always passes `walletId: 0` (`src/utils/smart-accounts.ts:212`); changing this requires editing the helper.
- Forgetting that `await sendMemoFieldInstruction(...)` already blocks until the `UserOperationExecuted` event fires (`src/utils/smart-accounts.ts:230-232`) — no manual polling needed.
- Mixing up FXRP wei (18 decimals) with XRPL drops (`xrpToDrops` → 6-decimal UBA). Use 18-decimal amounts when calling FXRP as an ERC20 on Coston2; only convert via `xrpToDrops` when an interface explicitly expects UBA.
- Calling `waitForUserOperationExecuted` directly — it's already invoked inside `sendMemoFieldInstruction`.

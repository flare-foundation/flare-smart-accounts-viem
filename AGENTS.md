# Flare Smart Accounts (Viem) – Agent Guide

This file helps AI agents and developers quickly understand the repository and where to look when making changes.

## What This Repo Is

**flare-smart-accounts-viem** is an example/starter codebase for interacting with **Flare smart accounts** using **Viem** and **xrpl** libraries. It is maintained by Flare Network.

- **Purpose:** TypeScript scripts that demonstrate Flare smart-account flows: FXRP minting/transfer, vault deposits, custom instructions, and lending-related operations.
- **Audience:** Developers integrating with Flare (testnet/mainnet) who want copy-paste or reference implementations.

## Tech Stack

- **Package manager:** `pnpm` (preferred). Scripts are run through pnpm (e.g. `pnpm run script …`).
- **Runtime:** Node.js, scripts run with `tsx` (see `package.json` → `script`).
- **EVM:** [Viem](https://viem.sh/) 2.x; chain used in examples is **Flare Coston2 Testnet** (see `src/utils/client.ts`).
- **XRPL:** [xrpl](https://js.xrpl.org/) for XRPL wallets and payments (used to submit instructions and pay fees).
- **Flare packages:** `@flarenetwork/flare-wagmi-periphery-package` (ABIs, chain config), `@flarenetwork/smart-accounts-encoder` (human-readable interface and automatic encoding of Flare smart account instructions).

## Repository Layout

```
flare-smart-accounts-viem/
├── src/
│   ├── abis/              # Contract ABIs (ERC20, CustomInstructionsFacet, DummyBridge, DummyLending, etc.)
│   ├── utils/             # Shared client, smart-account helpers, XRPL, fassets, event types
│   ├── flare-lending/     # Flare lending protocol demonstration
│   ├── index.ts           # (currently empty)
│   ├── mint-and-transfer.ts
│   ├── state-lookup.ts
│   ├── upshift-mint-and-deposit.ts
│   ├── custom-instructions.ts
│   └── ...
├── package.json
├── README.md
└── .env                   # Not committed; copy from .env.example
```

- **Scripts** are in `src/` (and `src/flare-lending/`). Run with: `pnpm run script <path>`, e.g. `pnpm run script src/mint-and-transfer.ts`.
- **Shared logic** lives in `src/utils/`: Viem/XRPL clients, smart-account reads (personal account, vaults, fees, custom instruction encoding/registration), fassets (FXRP balance/decimals), and event types.

## Flare Smart Accounts (official overview)

The [Flare Smart Accounts overview](https://dev.flare.network/smart-accounts/overview) describes the system this repo builds on:

- **Account abstraction:** Each XRPL address has a unique **smart account** on Flare, controllable only by that XRPL user. Users can act on Flare without holding FLR; they pay in XRP on the XRPL.
- **Workflow:** (1) User sends a **Payment** on the XRPL to an operator address, with instructions in the memo field and enough XRP for the fee. (2) Operator gets a Payment proof from the Flare Data Connector and calls `executeTransaction` on **MasterAccountController** with the proof and user’s XRPL address. (3) The user’s smart account executes the instruction on Flare.

**Payment receipt format:** First byte = instruction code (type nibble + command nibble), second byte = wallet identifier (0 unless assigned by Flare Foundation), remaining 30 bytes = instruction parameters.

**Instruction types (by type ID):**

- **FXRP (0x00):** `collateralReservation`, `transfer`, `redeem`
- **Firelight (0x01):** `collateralReservationAndDeposit`, `deposit`, `redeem`, `claimWithdraw`
- **Upshift (0x02):** `collateralReservationAndDeposit`, `deposit`, `requestRedeem`, `claim`

This repo implements sending those instructions (and custom instructions) via XRPL payments and waiting for execution on Flare.

## Core Concepts (for agents)

1. **Personal account**  
   The smart account for an XRPL address: derived via MasterAccountController (`getPersonalAccountAddress`). All on-chain actions run as this EVM account.

2. **Instructions and fees**  
   Actions are encoded as instructions and sent via **XRPL Payment** to the operator address (memo = receipt, amount = fee). Fee from `getInstructionFee(encodedInstruction)`.

3. **Custom instructions**  
   Arbitrary EVM calls (target + value + data) via CustomInstructionsFacet: register once, then encode and send via XRPL. See `custom-instructions.ts` and `flare-lending/custom-deposit-fxrp-as-collateral.ts`.

4. **FXRP and vaults**  
   FXRP = wrapped XRP on Flare. Vaults (Firelight/Upshift, ERC-4626) and agent vaults are registered on MasterAccountController. Helpers in `utils/fassets.ts` and `utils/smart-accounts.ts`.

5. **Environment**  
   `.env` (from `.env.example`): `PRIVATE_KEY` (EVM signer in `client.ts`), `XRPL_SEED` (XRPL wallet for instruction payments).

## Where to Look When…

- **Adding a new “do something with my smart account” script:** Reuse `utils/client.ts`, `utils/smart-accounts.ts`, and either `utils/xrpl.ts` (for XRPL payments) or existing scripts (e.g. `mint-and-transfer.ts`, `custom-instructions.ts`) for the flow (encode → get fee → XRPL payment → wait for event).
- **Changing how instructions are encoded or sent:** `utils/smart-accounts.ts` (fees, personal account, custom instruction registration/encoding), and the encoder package for FXRP-specific instructions.
- **Adding or changing contract calls:** `src/abis/` for ABIs; `utils/client.ts` for `publicClient` / `walletClient` and chain.
- **Lending/collateral examples:** `src/flare-lending/` (e.g. custom deposit FXRP as collateral) and ABIs like `DummyBridge`, `DummyLending`, `ERC20`.

## Commands

All commands use **pnpm** (preferred package manager). Run scripts via pnpm:

- Install: `pnpm install`
- Run a script: `pnpm run script src/<script>.ts`
- Build: `pnpm run build`
- Lint: `pnpm run lint` / `pnpm run lint:check`
- Format: `pnpm run format` / `pnpm run format:check`
- Tests: `pnpm run test` (Vitest, root `./src`)

## External Docs

- [Flare Developer Hub](https://dev.flare.network/)
- [Flare Smart Accounts overview](https://dev.flare.network/smart-accounts/overview) — workflow, instruction format, FXRP/Firelight/Upshift command IDs
- [Viem](https://viem.sh/)

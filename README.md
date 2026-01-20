<!-- LOGO -->

<div align="center">
  <a href="https://flare.network/" target="blank">
    <img src="https://content.flare.network/Flare-2.svg" width="300" alt="Flare Logo" />
  </a>
  <br />
  Example TypeScript scripts for interacting with the Flare smart accounts using Viem.
  <br />
  <a href="#PROJECT_NAME">About</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
  ·
  <a href="SECURITY.md">Security</a>
  ·
  <a href="CHANGELOG.md">Changelog</a>
</div>

# Flare smart account with Viem

This repository contains example code for interacting with the Flare smart accounts system using the Viem library. All example scripts are located in the `src` directory.

```sh
src
├── abis
├── utils
├── index.ts
├── mint-and-transfer.ts: mint FXRP and transfer it to a Flare account; essentially, this allows you to mint FXRP to an arbitrary Flare address.
├── README.md
├── state-lookup.ts: get personal account of an XRPL address, its FXRP balance, the XRP balance of the address...
└── upshift-mint-and-deposit.ts: mint FXRP and deposit it to an Upshift type vault
```

## Setup

1. **Clone the repository:**

   ```sh
   git clone <repository-url>
   cd flare-smart-accounts-viem
   ```

2. **Create a `.env` file:**

   ```sh
   cp .env.example .env
   ```

3. **Configure your environment:**
   Edit the `.env` file and add your configuration values (private keys, RPC URLs, etc.).

4. **Install dependencies:**

   ```sh
   pnpm install
   ```

   > **Note:** You can use `npm` or `yarn` instead of `pnpm` if you prefer.

## Running Scripts

Execute any script in the `src` directory using:

```sh
pnpm run script <path-to-file>
```

**Example:**

```sh
pnpm run script src/mint-and-transfer.ts
```

## Resources

- [Flare Developer Hub](https://dev.flare.network/)
- [Viem Documentation](https://viem.sh/)

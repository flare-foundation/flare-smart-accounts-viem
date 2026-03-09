/**
 * Checks if an XRPL address has a Flare smart account.
 *
 * If it returns an XRPL account, then it's a smart account.
 *
 * Usage:
 *   pnpm run script src/is-smart-account.ts rN7n7otQDd6FczFgLdlqtyMVrn3e1Djxv7
 */

import { getPersonalAccountAddress, getXrplAccountForAddress } from "./utils/smart-accounts";

async function main() {
  const xrplAddress = process.argv[2];
  if (!xrplAddress) {
    console.error("Usage: pnpm run script src/is-smart-account.ts <xrpl-address>");
    process.exit(1);
  }

  const evmAddress = await getPersonalAccountAddress(xrplAddress);
  const xrplOwner = await getXrplAccountForAddress(evmAddress);

  if (xrplOwner) {
    console.log("XRPL address:", xrplAddress);
    console.log("EVM (personal) address:", evmAddress);
  } else {
    console.log("Not a smart account (or not yet activated)");
  }
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

/**
 * Checks if an XRPL address has a Flare smart account.
 *
 * If it returns an XRPL account, then it's a smart account.
 *
 * Usage:
 *   pnpm run script src/is-smart-account.ts rN7n7otQDd6FczFgLdlqtyMVrn3e1Djxv7
 */

import { getPersonalAccountAddress, getXrplAccountForAddress } from "./utils/smart-accounts";

// XRPL address
const XRPL_ADDRESS = "rwda86zPcrrph3Db9nBQxHNw2uuK1VrGSg";

async function main() {
  const evmAddress = await getPersonalAccountAddress(XRPL_ADDRESS);
  const xrplOwner = await getXrplAccountForAddress(evmAddress);

  if (xrplOwner) {
    console.log("Address is a smart account");
    console.log("XRPL address:", XRPL_ADDRESS);
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

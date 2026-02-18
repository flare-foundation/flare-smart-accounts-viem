---
name: fdc
description: Flare Data Connector (FDC) – how to work with attested external data, verifiers, DA layer, and Merkle proofs on Flare. Use when integrating FDC, fetching XRPL Payment proofs, verifying attestations, or querying the DA layer.
---

# Flare Data Connector (FDC) Skill

## Overview

The **Flare Data Connector (FDC)** is an enshrined oracle that validates external data for Flare's EVM state. It lets users submit attested data that smart contracts can trust. Key properties:

- **Proof-based verification**: Smart contracts validate Merkle proofs against an onchain Merkle root
- **DA Layer**: Offchain API for attestation responses and proofs; access is trustless (users can recompute roots)
- **Network security**: Attestation requires 50%+ signature weight from data providers

## Workflow (User / Smart Account)

1. **Request**: Submit attestation request to `FdcHub` via `requestAttestation`, pay fee
2. **Wait**: Round finalizes (~90–135s); relay event signals finalization
3. **Fetch**: Retrieve response and Merkle proof from the DA Layer
4. **Verify**: Smart contract uses `FdcVerification` to validate proof against root
5. **Act**: Contract uses verified data for computation

## Attestation Types

| Type | Chains / Use |
|------|--------------|
| **Payment** | Non-EVM: BTC, DOGE, XRP |
| **EVMTransaction** | EVM: ETH, FLR, SGB |
| **JsonApi** | Web2 data via JQ (Coston/Coston2) |
| **BalanceDecreasingTransaction** | Balance decrease validation |
| **ReferencedPaymentNonexistence** | Payment absence in interval |
| **ConfirmedBlockHeightExists** | Block existence |
| **AddressValidity** | Address format/checksum |

## Environment Variables (this repo)

From `.env.example`:

```bash
# FDC Verifiers (attestation APIs)
VERIFIER_URL_TESTNET=https://fdc-verifiers-testnet.flare.network/
VERIFIER_URL_MAINNET=https://fdc-verifiers-mainnet.flare.network/
VERIFIER_API_KEY_TESTNET=
VERIFIER_API_KEY_MAINNET=

# DA Layer (proof + response retrieval)
COSTON2_DA_LAYER_URL="https://ctn2-data-availability.flare.network/"
# Also: COSTON_DA_LAYER_URL, FLARE_DA_LAYER_URL, SONGBIRD_DA_LAYER_URL
```

## Integration with Smart Accounts

In this repo, the **operator** uses FDC to prove XRPL Payments. Flow:

1. User sends XRPL Payment (memo = instruction, amount = fee)
2. Operator gets Payment attestation/response from FDC
3. Operator submits proof to `MasterAccountController.executeTransaction`
4. User’s smart account runs the instruction on Flare

When adding flows that depend on attested data (e.g. XRPL Payment, EVM tx, JsonApi):

- Use `VERIFIER_URL_*` for attestation requests
- Use `*_DA_LAYER_URL` for fetching responses and Merkle proofs
- Use `FdcVerification` (or equivalent) in contracts to verify proofs

## References

- [FDC Overview](https://dev.flare.network/fdc/overview)
- [FDC Reference](https://dev.flare.network/fdc/reference)
- [Getting Started](https://dev.flare.network/fdc/getting-started)

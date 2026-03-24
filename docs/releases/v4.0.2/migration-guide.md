# Migration Guide v4.0.1 to v4.0.2

## Overview

This guide covers migrating from midnight-js v4.0.1 to v4.0.2. The primary change is the **revert of the `addCalls` API refactor** (#648) that was introduced in v4.0.1. If you are upgrading directly from v3.2.0, the `createUnprovenLedgerCallTx` signature in v4.0.2 matches v3.2.0 (with ledger-v8 types) — follow the [v4.0.1 migration guide](../v4.0.1/migration-guide.md) but skip breaking change #4.

## Step 1: Update Dependencies

```bash
yarn upgrade @midnight-ntwrk/midnight-js-contracts@^4.0.2
yarn upgrade @midnight-ntwrk/http-client-proof-provider@^4.0.2
```

## Step 2: Revert `createUnprovenLedgerCallTx` Call Sites

If you adapted call sites to the v4.0.1 signature, revert them.

**Before (v4.0.1):**
```typescript
const tx = createUnprovenLedgerCallTx(
  circuitId,
  contractAddress,
  initialContractState,
  zswapChainState,
  publicTranscript,           // Op<AlignedValue>[]
  privateTranscriptOutputs,
  input,
  output,
  nextZswapLocalState,
  encryptionPublicKey,
  ledgerParameters             // LedgerParameters
);
```

**After (v4.0.2):**
```typescript
const tx = createUnprovenLedgerCallTx(
  circuitId,
  contractAddress,
  initialContractState,
  zswapChainState,
  partitionedTranscript,       // PartitionedTranscript
  privateTranscriptOutputs,
  input,
  output,
  nextZswapLocalState,
  encryptionPublicKey
  // ledgerParameters removed from this function
);
```

## Step 3: Restore `extractUserAddressedOutputs` Usages

If you removed calls to `extractUserAddressedOutputs` when upgrading to v4.0.1, restore them. The function is once again exported from `@midnight-ntwrk/midnight-js-contracts`.

```typescript
import { extractUserAddressedOutputs } from '@midnight-ntwrk/midnight-js-contracts';

const outputs = extractUserAddressedOutputs(transcript);
```

## Step 4: (Optional) Add Proof Server Headers

If your proof server requires authentication, you can now pass headers:

```typescript
const provider = httpClientProvingProvider(zkConfigProvider, proofServerUrl, {
  headers: { 'Authorization': 'Bearer <token>' }
});
```

## Troubleshooting

### Error: "expected a cell, received null"

**Cause:** Still using v4.0.1's `addCalls` approach with shielded contracts.

**Solution:** Ensure you are on v4.0.2 and using `partitionedTranscript` (not `publicTranscript`). If using `createUnprovenCallTx` (the high-level API), simply updating the dependency is sufficient — the fix is internal.

### Error: "attempted to spend from a Merkle tree that was not rehashed"

**Cause:** Chain state Merkle tree not rehashed before coin spending.

**Solution:** Upgrade to v4.0.2. Fixed internally in `zswapStateToOffer` — no code changes needed.

### Error: `CompactError` not propagated from deploy transactions

**Cause:** `createUnprovenDeployTxFromVerifierKeys` only caught `ContractRuntimeError`, not `ContractConfigurationError`.

**Solution:** Upgrade to v4.0.2. Fixed internally — no code changes needed.

## Rollback Plan

If rollback is needed:
1. Downgrade to v4.0.1: `yarn upgrade @midnight-ntwrk/midnight-js-contracts@^4.0.1`
2. Re-apply v4.0.1 breaking change #4 adaptations (see [v4.0.1 migration guide](../v4.0.1/migration-guide.md))
3. Note: shielded contract operations will not work on v4.0.1

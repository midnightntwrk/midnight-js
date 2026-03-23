# Migration Guide v3.2.0 to v4.0.1

## Overview

This guide covers migrating from midnight-js v3.2.0 to v4.0.1. The major change is the upgrade from ledger v7 to ledger v8, which renames "impure circuits" to "provable circuits" and introduces `LedgerParameters` flow through circuit execution.

## Step 1: Update Dependencies

```bash
yarn upgrade @midnight-ntwrk/midnight-js-types@^4.0.1
yarn upgrade @midnight-ntwrk/midnight-js-contracts@^4.0.1
yarn upgrade @midnight-ntwrk/indexer-public-data-provider@^4.0.1
```

Replace `@midnight-ntwrk/ledger-v7` with `@midnight-ntwrk/ledger-v8` in your `package.json`:

```json
{
  "dependencies": {
    "@midnight-ntwrk/ledger-v8": "^8.0.2"
  }
}
```

## Step 2: Update Ledger Imports

Replace all imports from `ledger-v7` with `ledger-v8`.

**Before (v3.2.0):**
```typescript
import { type ContractAddress, type ZswapChainState } from '@midnight-ntwrk/ledger-v7';
```

**After (v4.0.1):**
```typescript
import { type ContractAddress, type LedgerParameters, type ZswapChainState } from '@midnight-ntwrk/ledger-v8';
```

## Step 3: Rename ImpureCircuitId to ProvableCircuitId

### 3.1 Update Type References

**Before (v3.2.0):**
```typescript
import { type Contract } from '@midnight-ntwrk/compact-js';

type MyCircuitId = Contract.ImpureCircuitId<MyContract>;
```

**After (v4.0.1):**
```typescript
import { type Contract } from '@midnight-ntwrk/compact-js';

type MyCircuitId = Contract.ProvableCircuitId<MyContract>;
```

### 3.2 Update Method Calls

**Before (v3.2.0):**
```typescript
const ids = ContractExecutable.make(compiledContract).getImpureCircuitIds();
```

**After (v4.0.1):**
```typescript
const ids = ContractExecutable.make(compiledContract).getProvableCircuitIds();
```

### 3.3 Update Generic Parameters (Optional)

For consistency with the SDK codebase, rename generic parameters from `ICK` to `PCK`:

```typescript
// Before
function myFunction<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>(...) { }

// After
function myFunction<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(...) { }
```

## Step 4: Update `queryZSwapAndContractState` Call Sites

The return type now includes `LedgerParameters` as a third tuple element.

**Before (v3.2.0):**
```typescript
const result = await publicDataProvider.queryZSwapAndContractState(address);
if (result) {
  const [zswapChainState, contractState] = result;
}
```

**After (v4.0.1):**
```typescript
const result = await publicDataProvider.queryZSwapAndContractState(address);
if (result) {
  const [zswapChainState, contractState, ledgerParameters] = result;
}
```

## Step 5: Include `ledgerParameters` in Direct Circuit Calls

If you call `createUnprovenCallTxFromInitialStates` directly, add `ledgerParameters` to the options.

**Before (v3.2.0):**
```typescript
const result = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
  compiledContract,
  contractAddress,
  circuitId,
  coinPublicKey,
  initialContractState,
  initialZswapChainState
}, walletEncryptionPublicKey);
```

**After (v4.0.1):**
```typescript
const result = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
  compiledContract,
  contractAddress,
  circuitId,
  coinPublicKey,
  initialContractState,
  initialZswapChainState,
  ledgerParameters
}, walletEncryptionPublicKey);
```

If you use `createUnprovenCallTx` (the high-level API), ledger parameters are fetched and passed automatically - no changes needed.

## Step 6: Update `createUnprovenLedgerCallTx` Call Sites (#648, #689)

If you call `createUnprovenLedgerCallTx` directly, the signature has changed.

**Before (v3.2.0):**
```typescript
import { createUnprovenLedgerCallTx, extractUserAddressedOutputs } from '@midnight-ntwrk/midnight-js-contracts';

const tx = createUnprovenLedgerCallTx(
  circuitId,
  contractAddress,
  initialContractState,
  zswapChainState,
  partitionedTranscript,
  privateTranscriptOutputs,
  input,
  output,
  nextZswapLocalState,
  encryptionPublicKey
);
```

**After (v4.0.1):**
```typescript
import { createUnprovenLedgerCallTx } from '@midnight-ntwrk/midnight-js-contracts';

const tx = createUnprovenLedgerCallTx(
  circuitId,
  contractAddress,
  initialContractState,
  zswapChainState,
  publicTranscript,        // Op<AlignedValue>[] instead of PartitionedTranscript
  privateTranscriptOutputs,
  input,
  output,
  nextZswapLocalState,
  encryptionPublicKey,
  ledgerParameters         // NEW - required
);
```

Also remove all usages of `extractUserAddressedOutputs` - unshielded offer handling is now automatic.

## Step 7: Recompile Contracts

All compiled contract artifacts need to be regenerated for ledger v8 compatibility:

```bash
yarn build
```

## Step 8: Update Infrastructure

- Update indexer to v4
- Update proof server containers to ledger v8 compatible versions
- Update `compose.yml` and `proof-server.yml` with new image tags

## Troubleshooting

### Error: "Cannot find module '@midnight-ntwrk/ledger-v7'"

Replace all imports from `@midnight-ntwrk/ledger-v7` with `@midnight-ntwrk/ledger-v8` and update your `package.json`.

### Error: "Property 'ImpureCircuitId' does not exist on type 'typeof Contract'"

Replace `Contract.ImpureCircuitId` with `Contract.ProvableCircuitId`.

### Error: "Property 'getImpureCircuitIds' does not exist"

Replace `getImpureCircuitIds()` with `getProvableCircuitIds()`.

### Error: "Property 'ledgerParameters' is missing in type"

Add `ledgerParameters` to your call options object. Get it from `queryZSwapAndContractState` (third element) or use `LedgerParameters.initialParameters()`.

### Error: "Tuple type '[ZswapChainState, ContractState]' of length '2' has no element at index '2'"

Update your destructuring of `queryZSwapAndContractState` results to include the third element.

### Error: "Module has no exported member 'extractUserAddressedOutputs'"

Remove all usages. Unshielded offer handling is now managed automatically by the ledger's `addCalls` API.

### Error: "Expected 11 arguments, but got 10" (createUnprovenLedgerCallTx)

Add `ledgerParameters` as the last parameter, and replace `partitionedTranscript` with `publicTranscript`.

## Rollback Plan

If rollback is needed:
1. Revert `package.json` dependencies to use `@midnight-ntwrk/ledger-v7` and v3.2.0 SDK packages
2. Revert import paths from `ledger-v8` to `ledger-v7`
3. Revert `ProvableCircuitId` to `ImpureCircuitId`
4. Remove `ledgerParameters` from call options
5. Revert `createUnprovenLedgerCallTx` to use `partitionedTranscript` and restore `extractUserAddressedOutputs`
6. Revert infrastructure to previous indexer and proof server versions
7. Recompile contracts for ledger v7

# Release Notes v4.0.1

**Release Date:** March 20, 2026
**Previous Version:** v3.2.0
**Node.js Requirement:** >=22

## Breaking Changes

### Ledger v7 to v8 Migration (#607)
All ledger imports have been upgraded from `@midnight-ntwrk/ledger-v7` to `@midnight-ntwrk/ledger-v8`. The concept of "impure circuits" has been renamed to "provable circuits" throughout the SDK.

- **Before:** `Contract.ImpureCircuitId<C>`
- **After:** `Contract.ProvableCircuitId<C>`

```typescript
// v3.2.0
import { type ContractAddress } from '@midnight-ntwrk/ledger-v7';
type CircuitId = Contract.ImpureCircuitId<MyContract>;

// v4.0.1
import { type ContractAddress } from '@midnight-ntwrk/ledger-v8';
type CircuitId = Contract.ProvableCircuitId<MyContract>;
```

### `queryZSwapAndContractState` Returns `LedgerParameters` (#633)
The return type now includes `LedgerParameters` as a third tuple element.

- **Before:** `Promise<[ZswapChainState, ContractState] | null>`
- **After:** `Promise<[ZswapChainState, ContractState, LedgerParameters] | null>`

```typescript
// v3.2.0
const result = await provider.queryZSwapAndContractState(address);
const [zswapState, contractState] = result;

// v4.0.1
const result = await provider.queryZSwapAndContractState(address);
const [zswapState, contractState, ledgerParameters] = result;
```

### `CallOptionsProviderDataDependencies` Requires `ledgerParameters` (#633)
The `ledgerParameters` field is now required when constructing call options for circuit execution.

```typescript
// v4.0.1
const callOptions: CallOptionsProviderDataDependencies = {
  coinPublicKey,
  initialContractState,
  initialZswapChainState,
  ledgerParameters // NEW - required
};
```

### Transaction Building Refactored to Use `addCalls` API (#648)
The internal transaction construction in `createUnprovenLedgerCallTx` has been refactored. The function now uses the ledger v8 `addCalls` API with `PrePartitionContractCall` instead of the deprecated `ContractCallPrototype` and manual `Intent` construction. The `extractUserAddressedOutputs` utility has been removed as unshielded offer handling is now managed by the ledger's `addCalls` API.

- `createUnprovenLedgerCallTx` signature now requires `ledgerParameters` parameter
- `extractUserAddressedOutputs` has been removed
- `partitionedTranscript` parameter replaced with `publicTranscript` (`Op<AlignedValue>[]`)
- `coinPublicKey` parameter removed (QueryContext is now constructed using lossless binary serialization path instead of `createCircuitContext`)

## Features

### LedgerParameters Flow Through Circuit Execution (#633)
Ledger parameters are now automatically fetched alongside contract state from the indexer and passed through to circuit execution. This ensures circuits have access to the correct ledger parameters for the block they are executing against.

The `PublicDataProvider` and `IndexerPublicDataProvider` now fetch `ledgerParameters` from the block associated with the contract state. When ledger parameters are not available from the indexer (e.g., for older blocks), `LedgerParameters.initialParameters()` is used as a fallback.

```typescript
// LedgerParameters are automatically included when using createUnprovenCallTx
const result = await createUnprovenCallTx(providers, options);

// Or when using createUnprovenCallTxFromInitialStates directly,
// include ledgerParameters in the options
const result = await createUnprovenCallTxFromInitialStates(
  zkConfigProvider,
  {
    compiledContract,
    contractAddress,
    circuitId,
    coinPublicKey,
    initialContractState,
    initialZswapChainState,
    ledgerParameters // Required
  },
  walletEncryptionPublicKey
);
```

### Ledger v8 Support (#607)
The SDK now targets ledger v8, bringing support for provable circuits (renamed from impure circuits) and updated indexer v4 compatibility. All contract compilation outputs have been regenerated for ledger v8 compatibility.

### `createProofProvider` Factory Function (#636)
A new `createProofProvider` utility is exported from `@midnight-ntwrk/midnight-js-types` that creates a `ProofProvider` from a `ProvingProvider`. This simplifies proof provider setup by wrapping the underlying proving provider with an optional cost model.

```typescript
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';

// Uses initial cost model by default
const proofProvider = createProofProvider(provingProvider);

// Or with a custom cost model
const proofProvider = createProofProvider(provingProvider, customCostModel);
```

## Bug Fixes

### Lossless Binary Path for QueryContext in `createUnprovenLedgerCallTx` (#689)
Fixed a lossy encode/decode cycle through `toLedgerQueryContext` that caused "expected a cell, received null" errors for contracts with non-trivial ledger state (bounded Merkle trees, complex cells). Replaced with the binary serialization path (`toLedgerContractState` + `LedgerQueryContext` constructor) which is proven lossless throughout the codebase. This also removed the `coinPublicKey` parameter from `createUnprovenLedgerCallTx`.

### Unshielded Offers for User-Addressed Claim Unshielded Spends (#558)
Fixed an issue where unshielded offers were not correctly attached for user-addressed claim unshielded spends. The `extractUserAddressedOutputs` function in ledger-utils was updated to properly handle the matching of unshielded outputs, ensuring correct transaction construction for claim operations. This function was later removed in #648 as unshielded offer handling is now managed by the ledger's `addCalls` API.

## Tests

### Night Wallet Transfer Tests (#646)
Added integration tests for night wallet unshielded transfers, including `balanceUnboundTransaction` usage validation.

## Dependencies

### Runtime Dependencies Updated
- `@midnight-ntwrk/ledger-v7` replaced with `@midnight-ntwrk/ledger-v8` 8.0.2
- `@midnight-ntwrk/wallet-sdk-facade`: Updated to 3.0.0-rc.0
- `@midnight-ntwrk/compact-js`: Updated to 2.5.0-rc.3
- `@midnight-ntwrk/compact-runtime`: Updated to 0.15.0
- `@midnight-ntwrk/platform-js`: Updated to 2.2.4
- `compactc`: Updated to 0.30.0

### Security Patches
- Patched `immutable` and `diff` packages (#649)
- Security dependencies update (#640)

### Infrastructure Updated
- Indexer updated to v4
- Proof server images updated for ledger v8
- Docker compose images updated to latest versions (#654)

## Documentation

- Updated release notes for 3.2.0 (#623)
- API documentation updates (#641, #655, #664)

## Links

- [Breaking Changes Details](./breaking-changes.md)
- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)

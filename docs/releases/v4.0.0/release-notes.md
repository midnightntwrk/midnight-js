# Release Notes v4.0.0

**Release Date:** March 17, 2026
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

// v4.0.0
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

// v4.0.0
const result = await provider.queryZSwapAndContractState(address);
const [zswapState, contractState, ledgerParameters] = result;
```

### `CallOptionsProviderDataDependencies` Requires `ledgerParameters` (#633)
The `ledgerParameters` field is now required when constructing call options for circuit execution.

```typescript
// v4.0.0
const callOptions: CallOptionsProviderDataDependencies = {
  coinPublicKey,
  initialContractState,
  initialZswapChainState,
  ledgerParameters // NEW - required
};
```

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

## Bug Fixes

### Unshielded Offers for User-Addressed Claim Unshielded Spends (#558)
Fixed an issue where unshielded offers were not correctly attached for user-addressed claim unshielded spends. The `findUnshieldedOffers` function in ledger-utils now properly handles the matching of unshielded outputs, ensuring correct transaction construction for claim operations.

## Dependencies

### Runtime Dependencies Updated
- `@midnight-ntwrk/ledger-v7` replaced with `@midnight-ntwrk/ledger-v8` 8.0.2
- `@midnight-ntwrk/wallet-sdk-facade`: Updated for ledger v8 compatibility
- `@midnight-ntwrk/compact-js`: Updated for provable circuit support

### Infrastructure Updated
- Indexer updated to v4
- Proof server images updated for ledger v8
- Docker compose configurations updated

## Documentation

- Updated release notes for 3.2.0 (#623)

## Links

- [Breaking Changes Details](./breaking-changes.md)
- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)

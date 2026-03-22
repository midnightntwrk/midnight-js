# midnight-js v4.0.1 Release Documentation

**Release Date:** March 17, 2026
**Previous Version:** v3.2.0
**Migration Complexity:** High

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [Breaking Changes](./breaking-changes.md) - Detailed breaking changes
- [New Features](./new-features.md) - Complete feature documentation
- [Migration Guide](./migration-guide.md) - Step-by-step upgrade
- [API Changes](./api-changes.md) - Complete API reference

## Breaking Changes (4)

1. **Ledger v7 to v8 upgrade** - `ImpureCircuitId` renamed to `ProvableCircuitId` across all APIs (#607)
2. **`queryZSwapAndContractState` return type changed** - Now returns `LedgerParameters` as third tuple element (#633)
3. **`CallOptionsProviderDataDependencies` requires `ledgerParameters`** - New required field for circuit execution (#633)
4. **Transaction building refactored to `addCalls` API** - `createUnprovenLedgerCallTx` signature changed, `extractUserAddressedOutputs` removed (#648)

## New Features (3)

1. LedgerParameters flow through circuit execution (#633)
2. Ledger v8 support with provable circuits (#607)
3. `createProofProvider` factory function for simplified proof provider setup (#636)

## Quick Migration

### Before (v3.2.0)
```typescript
import { type ContractAddress } from '@midnight-ntwrk/ledger-v7';

// ImpureCircuitId usage
type MyCircuit = Contract.ImpureCircuitId<MyContract>;

// queryZSwapAndContractState returns 2-tuple
const [zswapState, contractState] = await provider.queryZSwapAndContractState(address);
```

### After (v4.0.1)
```typescript
import { type ContractAddress } from '@midnight-ntwrk/ledger-v8';

// ProvableCircuitId usage
type MyCircuit = Contract.ProvableCircuitId<MyContract>;

// queryZSwapAndContractState returns 3-tuple
const [zswapState, contractState, ledgerParameters] = await provider.queryZSwapAndContractState(address);
```

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.8+

## Testing Checklist

- [ ] TypeScript compilation passes with new `ledger-v8` types
- [ ] All `ImpureCircuitId` references updated to `ProvableCircuitId`
- [ ] All `queryZSwapAndContractState` call sites destructure 3-tuple
- [ ] All `createUnprovenCallTxFromInitialStates` calls include `ledgerParameters`
- [ ] All `createUnprovenLedgerCallTx` call sites updated for new signature
- [ ] All `extractUserAddressedOutputs` usages removed
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass

---

**Last Updated:** March 19, 2026
**License:** Apache-2.0

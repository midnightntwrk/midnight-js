# Breaking Changes v4.0.0

## 1. Ledger v7 to v8: `ImpureCircuitId` Renamed to `ProvableCircuitId` (#607)

### Reason
The Midnight ledger has been upgraded from v7 to v8. As part of this upgrade, the concept of "impure circuits" has been renamed to "provable circuits" to better reflect their purpose.

### Impact
All code referencing `ImpureCircuitId`, `getImpureCircuitIds()`, or related generic parameters (`ICK`) must be updated. This affects:
- Type parameters on `CallOptions`, `CallResult`, `CallTxOptions`, and related types
- `MidnightProviders` generic parameter
- `CircuitCallTxInterface` and `CircuitMaintenanceTxInterfaces`
- Any custom code using `Contract.ImpureCircuitId`

### Before
```typescript
import { type ContractAddress, type ZswapChainState } from '@midnight-ntwrk/ledger-v7';
import { type Contract } from '@midnight-ntwrk/compact-js';

type MyCircuitId = Contract.ImpureCircuitId<MyContract>;

// Getting circuit IDs
const circuitIds = ContractExecutable.make(compiledContract).getImpureCircuitIds();

// Provider types
const providers: MidnightProviders<Contract.ImpureCircuitId<MyContract>> = { ... };
```

### After
```typescript
import { type ContractAddress, type ZswapChainState } from '@midnight-ntwrk/ledger-v8';
import { type Contract } from '@midnight-ntwrk/compact-js';

type MyCircuitId = Contract.ProvableCircuitId<MyContract>;

// Getting circuit IDs
const circuitIds = ContractExecutable.make(compiledContract).getProvableCircuitIds();

// Provider types
const providers: MidnightProviders<Contract.ProvableCircuitId<MyContract>> = { ... };
```

### Migration Steps
1. Replace all imports from `@midnight-ntwrk/ledger-v7` with `@midnight-ntwrk/ledger-v8`
2. Find and replace `ImpureCircuitId` with `ProvableCircuitId` in all type annotations
3. Replace `getImpureCircuitIds()` calls with `getProvableCircuitIds()`
4. Update generic parameter names from `ICK` to `PCK` (optional but recommended for consistency)
5. Update `ImpureCircuitId` import from `@midnight-ntwrk/compact-js/effect/Contract` to use `ProvableCircuitId`

---

## 2. `queryZSwapAndContractState` Returns 3-Tuple with `LedgerParameters` (#633)

### Reason
Circuit execution now requires `LedgerParameters` to correctly evaluate ledger-dependent logic. By returning them alongside the contract state, consistency between the state and parameters is guaranteed.

### Impact
All call sites that destructure the result of `queryZSwapAndContractState` must be updated to handle the third element.

### Before
```typescript
const result = await publicDataProvider.queryZSwapAndContractState(contractAddress);
if (result) {
  const [zswapChainState, contractState] = result;
  // ...
}
```

### After
```typescript
const result = await publicDataProvider.queryZSwapAndContractState(contractAddress);
if (result) {
  const [zswapChainState, contractState, ledgerParameters] = result;
  // ...
}
```

### Migration Steps
1. Find all usages of `queryZSwapAndContractState`
2. Update destructuring to include the third element `ledgerParameters`
3. If implementing `PublicDataProvider`, update the return type to include `LedgerParameters`

---

## 3. `CallOptionsProviderDataDependencies` Requires `ledgerParameters` (#633)

### Reason
Ledger parameters must be available during circuit execution for correct evaluation of ledger-dependent operations.

### Impact
All code constructing `CallOptionsProviderDataDependencies` (or types extending it such as `CallOptionsWithProviderDataDependencies` and `CallOptionsWithPrivateState`) must include the `ledgerParameters` field.

### Before
```typescript
const options: CallOptionsProviderDataDependencies = {
  coinPublicKey,
  initialContractState,
  initialZswapChainState
};
```

### After
```typescript
import { type LedgerParameters } from '@midnight-ntwrk/ledger-v8';

const options: CallOptionsProviderDataDependencies = {
  coinPublicKey,
  initialContractState,
  initialZswapChainState,
  ledgerParameters
};
```

### Migration Steps
1. Find all constructions of `CallOptionsProviderDataDependencies` or related types
2. Add the `ledgerParameters` field (obtain from `queryZSwapAndContractState` or `LedgerParameters.initialParameters()`)
3. If calling `createUnprovenCallTxFromInitialStates` directly, ensure `ledgerParameters` is included in the options

---

## Common Migration Issues

### Error: "Module '@midnight-ntwrk/ledger-v7' not found"
**Solution:** Replace all imports from `@midnight-ntwrk/ledger-v7` with `@midnight-ntwrk/ledger-v8`. Update `package.json` to depend on `@midnight-ntwrk/ledger-v8`.

### Error: "Property 'ImpureCircuitId' does not exist on type 'typeof Contract'"
**Solution:** Replace `Contract.ImpureCircuitId` with `Contract.ProvableCircuitId` and update the import to use `ProvableCircuitId` from `@midnight-ntwrk/compact-js/effect/Contract`.

### Error: "Property 'getImpureCircuitIds' does not exist"
**Solution:** Replace `getImpureCircuitIds()` with `getProvableCircuitIds()`.

### Error: "Property 'ledgerParameters' is missing"
**Solution:** Add `ledgerParameters` to your call options. Obtain it from `queryZSwapAndContractState` (third tuple element) or use `LedgerParameters.initialParameters()` as a fallback.

### Error: "Type '[ZswapChainState, ContractState]' is not assignable to type '[ZswapChainState, ContractState, LedgerParameters]'"
**Solution:** If you implement `PublicDataProvider`, update `queryZSwapAndContractState` to return a 3-tuple including `LedgerParameters`.

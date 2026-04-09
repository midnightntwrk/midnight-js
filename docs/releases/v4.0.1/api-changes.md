# API Changes Reference v4.0.1

## Package: @midnight-ntwrk/midnight-js-types

### Modified Exports

#### `MidnightProviders`

**v3.2.0:**
```typescript
export interface MidnightProviders<
  ICK extends Contract.ImpureCircuitId<Contract.Any> = Contract.ImpureCircuitId<Contract.Any>,
  PSI extends PrivateStateId = PrivateStateId,
  PS = any
>
```

**v4.0.1:**
```typescript
export interface MidnightProviders<
  PCK extends AnyProvableCircuitId = AnyProvableCircuitId,
  PSI extends PrivateStateId = PrivateStateId,
  PS = any
>
```

**Breaking:** Generic parameter changed from `ICK extends Contract.ImpureCircuitId` to `PCK extends AnyProvableCircuitId`.

#### `PublicDataProvider.queryZSwapAndContractState`

**v3.2.0:**
```typescript
queryZSwapAndContractState(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<[ZswapChainState, ContractState] | null>;
```

**v4.0.1:**
```typescript
queryZSwapAndContractState(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<[ZswapChainState, ContractState, LedgerParameters] | null>;
```

**Breaking:** Return type now includes `LedgerParameters` as the third tuple element.

### New Exports

#### `AnyProvableCircuitId`

```typescript
export type AnyProvableCircuitId = Contract.ProvableCircuitId<Contract.Any>;
```

#### `AnyPrivateState`

```typescript
export type AnyPrivateState = Contract.PrivateState<Contract.Any>;
```

#### `createProofProvider`

```typescript
export const createProofProvider = (
  provingProvider: ProvingProvider,
  costModel?: CostModel
): ProofProvider;
```

---

## Package: @midnight-ntwrk/midnight-js-contracts

### Modified Exports

#### `CallOptionsBase`

**v3.2.0:**
```typescript
export type CallOptionsBase<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>
```

**v4.0.1:**
```typescript
export type CallOptionsBase<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
```

#### `CallOptionsWithArguments`

**v3.2.0:**
```typescript
export type CallOptionsWithArguments<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>
```

**v4.0.1:**
```typescript
export type CallOptionsWithArguments<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
```

#### `CallOptionsProviderDataDependencies`

**v3.2.0:**
```typescript
export type CallOptionsProviderDataDependencies = {
  readonly coinPublicKey: string;
  readonly initialContractState: ContractState;
  readonly initialZswapChainState: ZswapChainState;
};
```

**v4.0.1:**
```typescript
export type CallOptionsProviderDataDependencies = {
  readonly coinPublicKey: string;
  readonly initialContractState: ContractState;
  readonly initialZswapChainState: ZswapChainState;
  readonly ledgerParameters: LedgerParameters;
};
```

**Breaking:** New required `ledgerParameters` field.

#### `CallOptionsWithProviderDataDependencies`

**v3.2.0:**
```typescript
export type CallOptionsWithProviderDataDependencies<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>
```

**v4.0.1:**
```typescript
export type CallOptionsWithProviderDataDependencies<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
```

#### `CallOptionsWithPrivateState`

**v3.2.0:**
```typescript
export type CallOptionsWithPrivateState<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>
```

**v4.0.1:**
```typescript
export type CallOptionsWithPrivateState<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
```

#### `CallOptions`

**v3.2.0:**
```typescript
export type CallOptions<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>
```

**v4.0.1:**
```typescript
export type CallOptions<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
```

#### `CallResult` / `CallResultPrivate`

**v3.2.0:**
```typescript
export type CallResult<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>
export type CallResultPrivate<C extends Contract.Any, ICK extends Contract.ImpureCircuitId<C>>
```

**v4.0.1:**
```typescript
export type CallResult<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
export type CallResultPrivate<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>
```

#### `CircuitCallTxInterface`

**v3.2.0:**
```typescript
export type CircuitCallTxInterface<C extends Contract.Any> = {
  [ICK in Contract.ImpureCircuitId<C>]: { ... };
};
```

**v4.0.1:**
```typescript
export type CircuitCallTxInterface<C extends Contract.Any> = {
  [PCK in Contract.ProvableCircuitId<C>]: { ... };
};
```

#### `CircuitMaintenanceTxInterfaces`

**v3.2.0:**
```typescript
export type CircuitMaintenanceTxInterfaces<C extends Contract.Any> = Record<Contract.ImpureCircuitId<C>, CircuitMaintenanceTxInterface>;
```

**v4.0.1:**
```typescript
export type CircuitMaintenanceTxInterfaces<C extends Contract.Any> = Record<Contract.ProvableCircuitId<C>, CircuitMaintenanceTxInterface>;
```

#### `PublicContractStates`

**v3.2.0:**
```typescript
export type PublicContractStates = {
  readonly zswapChainState: ZswapChainState;
  readonly contractState: ContractState;
};
```

**v4.0.1:**
```typescript
export type PublicContractStates = {
  readonly zswapChainState: ZswapChainState;
  readonly contractState: ContractState;
  readonly ledgerParameters: LedgerParameters;
};
```

---

## Complete API Diff by Package

### @midnight-ntwrk/midnight-js-types

```diff
- import { type ContractAddress } from '@midnight-ntwrk/ledger-v7';
+ import { type ContractAddress } from '@midnight-ntwrk/ledger-v8';

- export type AnyImpureCircuitId = Contract.ImpureCircuitId<Contract.Any>;
+ export type AnyProvableCircuitId = Contract.ProvableCircuitId<Contract.Any>;
+ export type AnyPrivateState = Contract.PrivateState<Contract.Any>;

- ICK extends Contract.ImpureCircuitId<Contract.Any>
+ PCK extends AnyProvableCircuitId
```

### @midnight-ntwrk/midnight-js-contracts

```diff
- import { ImpureCircuitId } from '@midnight-ntwrk/compact-js/effect/Contract';
+ import { ProvableCircuitId } from '@midnight-ntwrk/compact-js/effect/Contract';

- import { type ZswapChainState } from '@midnight-ntwrk/ledger-v7';
+ import { type LedgerParameters, type ZswapChainState } from '@midnight-ntwrk/ledger-v8';

- getImpureCircuitIds()
+ getProvableCircuitIds()

- ImpureCircuitId<C>(options.circuitId)
+ ProvableCircuitId<C>(options.circuitId)

  createUnprovenLedgerCallTx:
- partitionedTranscript: PartitionedTranscript
+ publicTranscript: Op<AlignedValue>[]
+ ledgerParameters: LedgerParameters  (new parameter)
- coinPublicKey: CoinPublicKey         (removed - QueryContext now uses lossless binary path)

- export { extractUserAddressedOutputs }
+ (removed)
```

### @midnight-ntwrk/indexer-public-data-provider

```diff
  queryZSwapAndContractState returns:
- [ZswapChainState, ContractState]
+ [ZswapChainState, ContractState, LedgerParameters]

  GraphQL query now includes:
+ transaction { block { ledgerParameters } }
```

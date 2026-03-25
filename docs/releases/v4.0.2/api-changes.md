# API Changes Reference v4.0.2

## Package: @midnight-ntwrk/midnight-js-contracts

### Restored Exports

#### `extractUserAddressedOutputs`

Removed in v4.0.1 (#648), restored in v4.0.2 (#695).

```typescript
export const extractUserAddressedOutputs = (
  transcript: Transcript<AlignedValue> | undefined
): UtxoOutput[]
```

#### `createUnprovenLedgerCallTx` — signature restored

**v4.0.1:**
```typescript
export const createUnprovenLedgerCallTx = (
  circuitId: AnyProvableCircuitId,
  contractAddress: ContractAddress,
  initialContractState: ContractState,
  zswapChainState: ZswapChainState,
  publicTranscript: Op<AlignedValue>[],
  privateTranscriptOutputs: AlignedValue[],
  input: AlignedValue,
  output: AlignedValue,
  nextZswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey,
  ledgerParameters: LedgerParameters
): UnprovenTransaction
```

**v4.0.2:**
```typescript
export const createUnprovenLedgerCallTx = (
  circuitId: AnyProvableCircuitId,
  contractAddress: ContractAddress,
  initialContractState: ContractState,
  zswapChainState: ZswapChainState,
  partitionedTranscript: PartitionedTranscript,
  privateTranscriptOutputs: AlignedValue[],
  input: AlignedValue,
  output: AlignedValue,
  nextZswapLocalState: ZswapLocalState,
  encryptionPublicKey: EncPublicKey
): UnprovenTransaction
```

**Changes:** `publicTranscript` reverted to `partitionedTranscript`, `ledgerParameters` parameter removed.

### New Exports

#### `isEffectContractError`

```typescript
export const isEffectContractError = (
  error: unknown
): error is EffectContractError
```

Type guard for safely narrowing Effect-ts contract errors. Checks for `_tag` and `cause` properties.

## Package: @midnight-ntwrk/http-client-proof-provider

### Modified Exports

#### `ProvingProviderConfig`

**v4.0.1:**
```typescript
export interface ProvingProviderConfig {
  readonly timeout?: number;
}
```

**v4.0.2:**
```typescript
export interface ProvingProviderConfig {
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}
```

**Non-breaking:** New optional field added.

---

## Complete API Diff by Package

### @midnight-ntwrk/midnight-js-contracts

```diff
+ export const isEffectContractError: (error: unknown) => error is EffectContractError
+ export const extractUserAddressedOutputs: (transcript: Transcript<AlignedValue> | undefined) => UtxoOutput[]
  export const createUnprovenLedgerCallTx: (
    circuitId, contractAddress, initialContractState, zswapChainState,
-   publicTranscript: Op<AlignedValue>[],
+   partitionedTranscript: PartitionedTranscript,
    privateTranscriptOutputs, input, output, nextZswapLocalState,
-   encryptionPublicKey, ledgerParameters: LedgerParameters
+   encryptionPublicKey
  ) => UnprovenTransaction
```

### @midnight-ntwrk/http-client-proof-provider

```diff
  export interface ProvingProviderConfig {
    readonly timeout?: number;
+   readonly headers?: Record<string, string>;
  }
```

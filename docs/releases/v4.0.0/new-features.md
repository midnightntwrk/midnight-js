# New Features v4.0.0

## 1. LedgerParameters Flow Through Circuit Execution (#633)

Ledger parameters are now automatically fetched from the indexer alongside contract state and passed through to circuit execution. This ensures circuits always have access to the correct parameters for the block they reference.

### Usage

When using the high-level `createUnprovenCallTx`, ledger parameters are handled automatically:

```typescript
import { createUnprovenCallTx } from '@midnight-ntwrk/midnight-js-contracts';

// LedgerParameters are fetched and passed through automatically
const result = await createUnprovenCallTx(providers, {
  compiledContract,
  circuitId: 'myCircuit',
  contractAddress,
  privateStateId
});
```

When using the lower-level `createUnprovenCallTxFromInitialStates`, include `ledgerParameters` in the options:

```typescript
import { createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';

const [zswapState, contractState, ledgerParameters] =
  await publicDataProvider.queryZSwapAndContractState(address);

const result = await createUnprovenCallTxFromInitialStates(
  zkConfigProvider,
  {
    compiledContract,
    contractAddress,
    circuitId: 'myCircuit',
    coinPublicKey,
    initialContractState: contractState,
    initialZswapChainState: zswapState,
    ledgerParameters
  },
  walletEncryptionPublicKey
);
```

### API

```typescript
// New field in CallOptionsProviderDataDependencies
interface CallOptionsProviderDataDependencies {
  readonly coinPublicKey: string;
  readonly initialContractState: ContractState;
  readonly initialZswapChainState: ZswapChainState;
  readonly ledgerParameters: LedgerParameters; // NEW
}

// Updated return type on PublicDataProvider
queryZSwapAndContractState(
  contractAddress: ContractAddress,
  config?: BlockHeightConfig | BlockHashConfig
): Promise<[ZswapChainState, ContractState, LedgerParameters] | null>;

// New type in PublicContractStates
interface PublicContractStates {
  readonly zswapChainState: ZswapChainState;
  readonly contractState: ContractState;
  readonly ledgerParameters: LedgerParameters; // NEW
}
```

---

## 2. Ledger v8 with Provable Circuits (#607)

The SDK now targets ledger v8, which renames "impure circuits" to "provable circuits" for better semantic clarity. This is a terminology change reflecting that these circuits produce ZK proofs.

### Usage

```typescript
import { type Contract } from '@midnight-ntwrk/compact-js';

// Use ProvableCircuitId instead of ImpureCircuitId
type MyCircuitId = Contract.ProvableCircuitId<MyContract>;

// Get provable circuit IDs from a compiled contract
const circuitIds = ContractExecutable.make(compiledContract).getProvableCircuitIds();
```

### New Exported Types

```typescript
// From @midnight-ntwrk/midnight-js-types
export type AnyProvableCircuitId = Contract.ProvableCircuitId<Contract.Any>;
export type AnyPrivateState = Contract.PrivateState<Contract.Any>;
```

# API Changes Reference v3.0.0

## Package: @midnight-ntwrk/level-private-state-provider

### Modified Exports

#### LevelPrivateStateProviderConfig

**v2.1.0:**
```typescript
interface LevelPrivateStateProviderConfig {
  readonly midnightDbName: string;
  readonly privateStateStoreName: string;
  readonly signingKeyStoreName: string;
}
```

**v3.0.0:**
```typescript
interface LevelPrivateStateProviderConfig {
  readonly midnightDbName: string;
  readonly privateStateStoreName: string;
  readonly signingKeyStoreName: string;
  readonly walletProvider?: WalletProvider;
  readonly privateStoragePasswordProvider?: PrivateStoragePasswordProvider;
}
```

**Breaking:** Now requires either `walletProvider` or `privateStoragePasswordProvider`.

---

## Package: @midnight-ntwrk/midnight-js-types

### Modified Exports

#### MidnightProvider.submitTx

**v2.1.0:**
```typescript
interface MidnightProvider {
  submitTx(transaction: FinalizedTransaction): TransactionId;
}
```

**v3.0.0:**
```typescript
interface MidnightProvider {
  submitTx(transaction: FinalizedTransaction): Promise<TransactionId>;
}
```

**Breaking:** Return type changed to `Promise<TransactionId>`.

#### WalletProvider.balanceTx

**v2.1.0:**
```typescript
interface WalletProvider {
  balanceTx(tx: UnprovenTransaction): Promise<BalancedProvingRecipe>;
}
```

**v3.0.0:**
```typescript
interface WalletProvider {
  balanceTx(
    tx: UnboundTransaction,
    ttl?: Date
  ): Promise<FinalizedTransaction>;
}
```

**Breaking:**
- Input type changed from `UnprovenTransaction` to `UnboundTransaction`
- Return type changed to `FinalizedTransaction`
- Added optional `ttl` parameter
- Wallet now handles proving internally

#### Contract Call Signatures

**v2.1.0:**
```typescript
interface Contract<T> {
  call: {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
      ? (...args: A) => R
      : never;
  };
}
```

**v3.0.0:**
```typescript
interface Contract<T> {
  call: {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
      ? (...args: A) => Promise<R>
      : never;
  };
}
```

**Breaking:** All contract calls now return `Promise<R>`.

### Added Exports

#### UnboundTransaction

```typescript
export type UnboundTransaction = Transaction<SignatureEnabled, Proof, PreBinding>;
```

#### KeyMaterialProvider (#430)

```typescript
interface ZkConfigProvider {
  asKeyMaterialProvider(): KeyMaterialProvider;
}
```

#### PrivateStoragePasswordProvider

```typescript
export type PrivateStoragePasswordProvider = () => Promise<string>;
```

---

## Package: @midnight-ntwrk/midnight-js-contracts

### Modified Exports

#### deployContract (#370)

The `deployContract` function now accepts a `CompiledContract` from `@midnight-ntwrk/compact-js` instead of raw contract definitions.

**v2.1.0:**
```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';

const deployed = await deployContract(providers, {
  contract: MyContract,
  privateStateKey: 'myPrivateState',
  initialPrivateState: { counter: 0 }
});
```

**v3.0.0:**
```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import * as CompiledMyContract from './compiled/my-contract/contract/index.js';
import { witnesses, type MyPrivateState } from './witnesses';

// First, create the compiled contract
const MyCompiledContract = CompiledContract.make<
  CompiledMyContract.Contract<MyPrivateState>
>('MyContract', CompiledMyContract.Contract<MyPrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./compiled/my-contract')
);

// Then deploy using the new API
const deployed = await deployContract(providers, {
  compiledContract: MyCompiledContract,
  privateStateId: 'myPrivateState',
  initialPrivateState: { counter: 0 }
});

// Access the contract address
const { contractAddress } = deployed.deployTxData.public;

// Call contract methods
const result = await deployed.callTx.increment();
```

**Breaking:**
- `contract` option replaced with `compiledContract`
- `privateStateKey` option replaced with `privateStateId`
- Requires `CompiledContract` from `@midnight-ntwrk/compact-js`

#### submitDeployTx

```typescript
async function submitDeployTx<C extends Contract>(
  providers: SubmitTxProviders,
  options: DeployTxOptions<C>
): Promise<FinalizedTxData>;
```

#### submitCallTx

```typescript
async function submitCallTx<C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: SubmitTxProviders,
  options: CallTxOptions<C, ICK>
): Promise<FinalizedTxData>;
```

---

## Package: @midnight-ntwrk/indexer-public-data-provider

### Added Exports (#125)

#### queryUnshieldedBalances

```typescript
interface IndexerPublicDataProvider {
  queryUnshieldedBalances(
    contractAddress: ContractAddress,
    config?: QueryConfigOptions
  ): Promise<UnshieldedBalances | null>;
}
```

**Usage:**
```typescript
const balances = await provider.queryUnshieldedBalances(contractAddress);
```

### Modified Exports (#125)

#### Indexer Schema
Indexer schema updated to support unshielded token data and NIGHT token queries.

---

## Package: @midnight-ntwrk/compact-js (#370)

### New Package

`@midnight-ntwrk/compact-js` is a new package that provides a fluent API for working with compiled Compact contracts. This is a **major change** in how contracts are defined and used.

### CompiledContract Factory

The `CompiledContract` namespace provides a builder pattern for creating typed contract definitions.

#### CompiledContract.make

```typescript
function make<C extends Contract>(
  name: string,
  contractConstructor: new (...args: any[]) => C
): CompiledContractBuilder<C>;
```

#### CompiledContract.withWitnesses

```typescript
function withWitnesses<C extends Contract, W extends Witnesses<C>>(
  witnesses: W
): (builder: CompiledContractBuilder<C>) => CompiledContractBuilder<C>;
```

#### CompiledContract.withVacantWitnesses

```typescript
function withVacantWitnesses<C extends Contract>(
  builder: CompiledContractBuilder<C>
): CompiledContractBuilder<C>;
```

#### CompiledContract.withCompiledFileAssets

```typescript
function withCompiledFileAssets(
  path: string
): (builder: CompiledContractBuilder<C>) => CompiledContract<C>;
```

### Contract Type Utilities

```typescript
namespace Contract {
  type ImpureCircuitId<C> = /* circuit identifiers for contract C */;
}
```

### Usage Example

**v2.1.0:**
```typescript
import { Contract } from '@midnight-ntwrk/midnight-js-contracts';
import CounterContract from './contract';

const contract = new Contract(CounterContract, witnesses);
```

**v3.0.0:**
```typescript
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { Contract } from '@midnight-ntwrk/compact-js';
import * as CompiledCounter from './compiled/counter/contract/index.js';
import { witnesses, type CounterPrivateState } from './witnesses';

// Create compiled contract with fluent API
export const CompiledCounterContract = CompiledContract.make<
  CompiledCounter.Contract<CounterPrivateState>
>('Counter', CompiledCounter.Contract<CounterPrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./compiled/counter')
);

// For contracts without witnesses
export const CompiledSimpleContract = CompiledContract.make<
  CompiledSimple.Contract
>('Simple', CompiledSimple.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets('./compiled/simple')
);

// Extract circuit types
type CounterCircuits = Contract.ImpureCircuitId<CounterContract> & string;
```

---

## Package: @midnight-ntwrk/compact-runtime

### Modified Exports

#### WitnessContext

**v3.0.0** introduces `WitnessContext` type for defining witnesses with proper typing:

```typescript
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from './compiled/counter/contract/index.js';

type CounterPrivateState = {
  privateCounter: number;
};

export const witnesses = {
  privateIncrement: ({
    privateState
  }: WitnessContext<Ledger, CounterPrivateState>): [CounterPrivateState, []] => [
    { privateCounter: privateState.privateCounter + 1 },
    []
  ]
};
```

**Key points:**
- `WitnessContext<Ledger, PrivateState>` provides typed access to ledger and private state
- Witness functions return a tuple: `[NewPrivateState, OutputArgs]`
- The `Ledger` type is imported from the compiled contract output

### Added Exports

#### createCircuitContext

**Moved from:** `@midnight-ntwrk/compact`

```typescript
function createCircuitContext(): CircuitContext;
```

**Migration:**
```typescript
// Before
import { createCircuitContext } from '@midnight-ntwrk/compact';

// After
import { createCircuitContext } from '@midnight-ntwrk/compact-runtime';
```

#### parseCircuitResult

```typescript
interface CircuitContext {
  parseCircuitResult(data: Uint8Array): CircuitResult;
}
```

---

## Dependency Changes

### Runtime Dependencies

```typescript
// package.json
{
  "dependencies": {
    "@midnight-ntwrk/compact-js": "^x.x.x",       // NEW: Contract builder API
    "@midnight-ntwrk/compact-runtime": "^0.x.x",  // Updated: WitnessContext, createCircuitContext
    "@midnight-ntwrk/ledger-v7": "^7.x.x",        // Upgraded from ledger-v6
    "@midnight-ntwrk/wallet-sdk-facade": "1.0.0"
  }
}
```

---

## Type Changes Summary

### Breaking Type Changes

| Type | Change | Impact |
|------|--------|--------|
| `MidnightProvider.submitTx` | Return type `Promise<TransactionId>` | Must await |
| `WalletProvider.balanceTx` | Returns `FinalizedTransaction` (simplified) | Remove type guards |
| `Contract.call.*` | All return `Promise` | Must await |
| `LevelPrivateStateProvider` | Config required | Add auth config |
| `networkId` | Enum → String (#125) | Use string literals |
| `deployContract` options | `contract` → `compiledContract`, `privateStateKey` → `privateStateId` | Use Compact.js pattern |

### New Types

| Type | Package | Purpose |
|------|---------|---------|
| `UnboundTransaction` | types | Input for balanceTx |
| `KeyMaterialProvider` | types | DApp connector compatibility |
| `PrivateStoragePasswordProvider` | types | Storage encryption |
| `CompiledContract` | compact-js | Builder for contract definitions |
| `CompiledContractBuilder` | compact-js | Intermediate builder type |
| `Contract.ImpureCircuitId` | compact-js | Circuit identifier extraction |
| `WitnessContext` | compact-runtime | Typed witness context |

### Removed Types

| Type | Package | Replacement |
|------|---------|-------------|
| `NetworkId` (enum) | types (#125) | `string` |

---

## Complete API Diff by Package

### @midnight-ntwrk/level-private-state-provider

```diff
  interface LevelPrivateStateProviderConfig {
    readonly midnightDbName: string;
    readonly privateStateStoreName: string;
    readonly signingKeyStoreName: string;
+   readonly walletProvider?: WalletProvider;
+   readonly privateStoragePasswordProvider?: PrivateStoragePasswordProvider;
  }
```

### @midnight-ntwrk/midnight-js-types

```diff
  interface MidnightProvider {
-   submitTx(tx: FinalizedTransaction): TransactionId;
+   submitTx(tx: FinalizedTransaction): Promise<TransactionId>;
  }

  interface WalletProvider {
-   balanceTx(tx: UnprovenTransaction): Promise<BalancedProvingRecipe>;
+   balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction>;
  }

+ type UnboundTransaction = Transaction<SignatureEnabled, Proof, PreBinding>;

+ interface ZkConfigProvider {
+   asKeyMaterialProvider(): KeyMaterialProvider;
+ }

- enum NetworkId {
-   Mainnet = 'mainnet',
-   Testnet = 'testnet',
-   Devnet = 'devnet'
- }
+ // networkId is now plain string type
```

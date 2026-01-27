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

## Package: @midnight-ntwrk/compact

### Removed Exports

#### createCircuitContext

**Removed from:** `@midnight-ntwrk/compact`  
**Moved to:** `@midnight-ntwrk/compact-runtime`

**Migration:**
```typescript
// Before
import { createCircuitContext } from '@midnight-ntwrk/compact';

// After
import { createCircuitContext } from '@midnight-ntwrk/compact-runtime';
```

---

## Package: @midnight-ntwrk/compact-runtime

### Added Exports

#### createCircuitContext

```typescript
function createCircuitContext(): CircuitContext;
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
    "@midnight-ntwrk/ledger-v7": "^7.x.x",  // upgraded from ledger-v6
    "@midnight-ntwrk/wallet-sdk-facade": "1.0.0-beta.16",
    "@midnight-ntwrk/compact-runtime": "^0.x.x"  // updated for Compact.js
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

### New Types

| Type | Package | Purpose |
|------|---------|---------|
| `UnboundTransaction` | types | Input for balanceTx |
| `KeyMaterialProvider` | types | DApp connector compatibility |
| `PrivateStoragePasswordProvider` | types | Storage encryption |

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

# API Changes Reference v3.0.0

## Package: @midnight-ntwrk/level-private-state-provider

### Modified Exports

#### LevelPrivateStateProvider (Constructor)

**v2.1.0:**
```typescript
constructor(config: {
  storeDirectory: string;
})
```

**v3.0.0:**
```typescript
constructor(config: {
  storeDirectory: string;
  walletProvider?: WalletProvider;
  passwordProvider?: () => Promise<string>;
})
```

**Breaking:** Now requires either `walletProvider` or `passwordProvider`.

---

## Package: @midnight-ntwrk/types

### Modified Exports

#### MidnightProvider.submitTx

**v2.1.0:**
```typescript
interface MidnightProvider {
  submitTx(transaction: Transaction): TransactionId;
}
```

**v3.0.0:**
```typescript
interface MidnightProvider {
  submitTx(transaction: Transaction): Promise<TransactionId>;
}
```

**Breaking:** Return type changed to `Promise<TransactionId>`.

#### WalletProvider.balanceTx

**v2.1.0:**
```typescript
interface WalletProvider {
  balanceTx<T>(recipe: ProvingRecipe<T>): Promise<BalancedProvingRecipe<T>>;
}
```

**v3.0.0:**
```typescript
interface WalletProvider {
  balanceTx<T>(
    recipe: ProvingRecipe<T>
  ): Promise<BalancedProvingRecipe<T> | BalanceTransactionToProve>;
}
```

**Breaking:** Return type is now discriminated union.

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

#### BalanceTransactionToProve

```typescript
type BalanceTransactionToProve = {
  type: 'BalanceTransactionToProve';
  transaction: Transaction;
  metadata: {
    requiredBalance: bigint;
    availableBalance: bigint;
  };
};
```

#### PasswordProvider

```typescript
type PasswordProvider = () => Promise<string>;
```

#### UnprovenTransaction (#125)

```typescript
type UnprovenTransaction = {
  type: 'Unproven';
  recipe: TransactionRecipe;
};
```

#### ProvenTransaction (#125)

```typescript
type ProvenTransaction = {
  type: 'Proven';
  proof: Proof;
  transaction: Transaction;
};
```

#### UnshieldedBalance (#125)

```typescript
interface UnshieldedBalance {
  address: string;
  amount: bigint;
  token: 'NIGHT';
}
```

#### TransactionConfig (#125)

```typescript
interface TransactionConfig {
  ttl?: number; // Time-to-live in seconds
}
```

---

## Package: @midnight-ntwrk/indexer-public-data-provider

### Added Exports (#125)

#### queryUnshieldedBalances

```typescript
interface IndexerPublicDataProvider {
  queryUnshieldedBalances(address: string): Promise<UnshieldedBalance[]>;
}
```

**Usage:**
```typescript
const balances = await provider.queryUnshieldedBalances(myAddress);
```

#### getUnshieldedBalances

```typescript
interface IndexerPublicDataProvider {
  getUnshieldedBalances(
    addresses: string[]
  ): Promise<Map<string, UnshieldedBalance>>;
}
```

**Usage:**
```typescript
const balances = await provider.getUnshieldedBalances([addr1, addr2]);
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
    "@midnight-ntwrk/compact-runtime": "0.11.0-rc.1",
    "@midnight-ntwrk/ledger-v6": "6.1.0-alpha.6",
    "@midnight-ntwrk/onchain-runtime-v1": "1.0.0-alpha.5",
    "@midnight-ntwrk/wallet-sdk-facade": "1.0.0-beta.12"
  }
}
```

---

## Type Changes Summary

### Breaking Type Changes

| Type | Change | Impact |
|------|--------|--------|
| `MidnightProvider.submitTx` | Return type `Promise<TransactionId>` | Must await |
| `WalletProvider.balanceTx` | Union return type | Type guard needed |
| `Contract.call.*` | All return `Promise` | Must await |
| `LevelPrivateStateProvider` | Config required | Add auth config |
| `UnprovenTransaction` | New transaction type (#125) | New workflow |
| `ZswapOffer` | Empty offers removed (#125) | Must provide data |
| `networkId` | Enum → String (#125) | Use string literals |

### New Types

| Type | Package | Purpose |
|------|---------|---------|
| `BalanceTransactionToProve` | types | Balance transaction handling |
| `PasswordProvider` | types | Storage encryption |
| `UnprovenTransaction` | types (#125) | Unproven transaction workflow |
| `ProvenTransaction` | types (#125) | Proven transaction result |
| `UnshieldedBalance` | types (#125) | NIGHT token balances |
| `TransactionConfig` | types (#125) | Transaction TTL configuration |

### Removed Types

| Type | Package | Replacement |
|------|---------|-------------|
| `NetworkId` (enum) | types (#125) | `string` |

---

## Complete API Diff by Package

### @midnight-ntwrk/level-private-state-provider

```diff
  class LevelPrivateStateProvider {
    constructor(config: {
      storeDirectory: string;
+     walletProvider?: WalletProvider;
+     passwordProvider?: () => Promise<string>;
    })
  }
```

### @midnight-ntwrk/types

```diff
  interface MidnightProvider {
-   submitTx(tx: Transaction): TransactionId;
+   submitTx(tx: Transaction): Promise<TransactionId>;
  }

  interface WalletProvider {
    balanceTx<T>(
      recipe: ProvingRecipe<T>
-   ): Promise<BalancedProvingRecipe<T>>;
+   ): Promise<BalancedProvingRecipe<T> | BalanceTransactionToProve>;
  }

+ type BalanceTransactionToProve = {
+   type: 'BalanceTransactionToProve';
+   transaction: Transaction;
+   metadata: {
+     requiredBalance: bigint;
+     availableBalance: bigint;
+   };
+ };

- enum NetworkId {
-   Mainnet = 'mainnet',
-   Testnet = 'testnet',
-   Devnet = 'devnet'
- }
+ // networkId is now plain string type
+ interface Config {
+   networkId: string; // Free-form network identifier
+ }
```

---

## Compiler Requirements

- **TypeScript:** 5.0+
- **Node.js:** 22+
- **Package Manager:** Yarn 4.10.3 (recommended)

---

## Related Documentation

- [Release Notes](./release-notes.md)
- [Breaking Changes](./breaking-changes.md)
- [New Features](./new-features.md)
- [Migration Guide](./migration-guide.md)

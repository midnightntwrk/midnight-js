# Release Notes v3.0.0

**Release Date:** December 17, 2024  
**Previous Version:** v2.1.0  
**Node.js Requirement:** >=22

## Breaking Changes

### LevelPrivateStateProvider Configuration (#342, #346)
Authentication now requires explicit configuration.

- **Before:** `new LevelPrivateStateProvider(config)`
- **After:** Must provide `walletProvider` OR `passwordProvider`

```typescript
// Option 1: Wallet provider
const provider = new LevelPrivateStateProvider({
  ...config,
  walletProvider: myWalletProvider
});

// Option 2: Password provider (new)
const provider = new LevelPrivateStateProvider({
  ...config,
  passwordProvider: async () => 'my-secure-password'
});
```

### WalletProvider.balanceTx Return Type (#346)
Return type changed to discriminated union.

- **Before:** `BalancedProvingRecipe<T>`
- **After:** `BalancedProvingRecipe<T> | BalanceTransactionToProve`

```typescript
const result = await walletProvider.balanceTx(recipe);
if ('type' in result && result.type === 'BalanceTransactionToProve') {
  // Handle balance transaction
} else {
  // Handle proving recipe
}
```

### MidnightProvider.submitTx Now Async (#348)
Transaction submission is now asynchronous with indefinite waiting.

- **Before:** `submitTx(tx: Transaction): TransactionId`
- **After:** `submitTx(tx: Transaction): Promise<TransactionId>`

```typescript
// Before
const txId = midnightProvider.submitTx(tx);

// After
const txId = await midnightProvider.submitTx(tx);
```

### Unproven Transaction Types (#125)
New transaction type system for ledger v6.

- **Before:** `createTransaction(proof)`
- **After:** `createUnprovenTransaction(recipe)` → `prove()` → `submitTx()`

```typescript
// v3.0.0
const unprovenTx = createUnprovenTransaction(recipe);
const provenTx = await prover.prove(unprovenTx);
const txId = await provider.submitTx(provenTx.transaction);
```

### ZswapOffer Return Type (#125)
Empty Zswap state now returns undefined.

- **Before:** `zswapStateToOffer()` always returned `UnprovenOffer`
- **After:** Returns `UnprovenOffer | undefined`

```typescript
// v2.1.0
const offer = zswapStateToOffer(state, encKey);

// v3.0.0-alpha.11
const offer = zswapStateToOffer(state, encKey);
if (!offer) {
  // Handle empty state
}
```

### networkId Type Change (#125)
Network ID simplified to string type.

- **Before:** `NetworkId.Testnet` enum
- **After:** `'testnet-02'` string

```typescript
// v2.1.0
import { NetworkId } from '@midnight-ntwrk/types';
config.networkId = NetworkId.Testnet;

// v3.0.0
config.networkId = 'testnet-02';
```

## Features

### Configurable Password Provider
Add password provider with wallet fallback for encrypted storage.

```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  passwordProvider: async () => {
    return process.env.STORAGE_PASSWORD || 'fallback-password';
  }
});
```

### Async Contract Calls (#348)
Contract calls now support asynchronous execution.

```typescript
const result = await contractInstance.call.myMethod(params);
```

### Storage Encryption
AES-256-GCM encryption for private state storage.

```typescript
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  passwordProvider: async () => 'secure-password'
});
```

### BalanceTransactionToProve (#320)
New transaction type for balance operations.

```typescript
type BalanceTransactionToProve = {
  type: 'BalanceTransactionToProve';
  transaction: Transaction;
};
```

### Compact Compiler 0.27.0 (#373)
Updated to latest Compact compiler version.

### Unshielded Token Support (#125)
Support for NIGHT (unshielded) public tokens.

```typescript
import { IndexerPublicDataProvider } from '@midnight-ntwrk/indexer-public-data-provider';

// Query unshielded balances
const balances = await provider.queryUnshieldedBalances(address);
console.log('NIGHT balance:', balances[0].amount);

// Query multiple addresses
const addressBalances = await provider.getUnshieldedBalances([addr1, addr2]);
```

### Unproven Transaction Types (#125)
New transaction workflow with unproven types.

```typescript
const unprovenTx = createUnprovenTransaction(recipe);
const provenTx = await prover.prove(unprovenTx);
const txId = await provider.submitTx(provenTx.transaction);
```

### Transaction TTL Configuration (#125)
Configure transaction time-to-live.

```typescript
const tx = createTransaction(proof, { ttl: 600 }); // 10 minutes
```

## Bug Fixes

- Fix ESM/CJS packaging for proper module resolution
- Clean wallet provider types for better type safety (#342, #346)
- Fix repository URLs to use correct GitHub paths (#380)

## Performance

- Enhanced provider configuration (#9894f67)
- Improved transaction handling with async operations (#348)

## Dependencies

### Runtime Dependencies Updated
- `@midnight-ntwrk/compact-runtime`: 0.11.0-rc.1
- `@midnight-ntwrk/ledger-v6`: 6.1.0-alpha.6
- `@midnight-ntwrk/onchain-runtime-v1`: 1.0.0-alpha.5
- `@midnight-ntwrk/wallet-sdk-facade`: 1.0.0-beta.12

## Documentation

- Enhanced transaction documentation with execution phases
- Added indefinite waiting behavior documentation
- Multiple API documentation updates (#369, #378, #381, #382)

## Links

- [Breaking Changes Details](./breaking-changes.md)
- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)
- [GitHub Repository](https://github.com/midnightntwrk/midnight-js)

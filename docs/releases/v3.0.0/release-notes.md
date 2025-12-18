# Release Notes v3.0.0

**Release Date:** December 17, 2024  
**Previous Version:** v2.1.0  
**Node.js Requirement:** >=22

## Breaking Changes

### LevelPrivateStateProvider Configuration (#342, #346)
Authentication now requires explicit configuration.

- **Before:** `new LevelPrivateStateProvider(config)`
- **After:** Must provide `walletProvider` OR `privateStoragePasswordProvider`

```typescript
// Option 1: Wallet provider
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  walletProvider: myWalletProvider
});

// Option 2: Password provider (new)
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => 'my-secure-password'
});
```

### WalletProvider.balanceTx Return Type (#346)
Return type is now `BalancedProvingRecipe` (union of three types).

```typescript
const recipe = await walletProvider.balanceTx(unprovenTx);

if (recipe.type === 'TransactionToProve') {
  const provenTx = await prover.prove(recipe.transaction);
} else if (recipe.type === 'BalanceTransactionToProve') {
  const provenTx = await prover.prove(recipe.transactionToProve);
} else {
  // NothingToProve
  await provider.submitTx(recipe.transaction);
}
```

### MidnightProvider.submitTx Now Async (#348)
Transaction submission is now asynchronous with indefinite waiting.

- **Before:** `submitTx(tx: FinalizedTransaction): TransactionId`
- **After:** `submitTx(tx: FinalizedTransaction): Promise<TransactionId>`

```typescript
// Before
const txId = midnightProvider.submitTx(tx);

// After
const txId = await midnightProvider.submitTx(tx);
```

### Transaction Workflow (#125)
Use high-level submission functions for better workflow.

```typescript
// v3.0.0 - Use submitDeployTx or submitCallTx
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';

const result = await submitCallTx(providers, {
  contract: myContract,
  circuit: 'myCircuit',
  args: [arg1, arg2]
});
```

### ZswapOffer Return Type (#125)
Empty Zswap state now returns undefined.

- **Before:** `zswapStateToOffer()` always returned `UnprovenOffer`
- **After:** Returns `UnprovenOffer | undefined`

```typescript
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
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => {
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

### BalancedProvingRecipe Types (#320)
Enhanced proving recipe system with three types:
- `TransactionToProve` - requires proving
- `BalanceTransactionToProve` - requires balancing and proving
- `NothingToProve` - ready to submit

### Compact Compiler 0.27.0 (#373)
Updated to latest Compact compiler version.

### Unshielded Token Support (#125)
Support for NIGHT (unshielded) public tokens.

```typescript
import { IndexerPublicDataProvider } from '@midnight-ntwrk/indexer-public-data-provider';

const balances = await provider.queryUnshieldedBalances(contractAddress);
```

### Transaction TTL Support (#125)
Configure transaction time-to-live via `balanceTx`.

```typescript
const recipe = await walletProvider.balanceTx(
  unprovenTx,
  newCoins,
  new Date(Date.now() + 10 * 60 * 1000) // 10 min TTL
);
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

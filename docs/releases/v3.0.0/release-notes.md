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

### WalletProvider.balanceTx Signature Change
Signature simplified with wallet handling proving internally.

- **Before:** `balanceTx(tx: UnprovenTransaction) → Promise<...>`
- **After:** `balanceTx(tx: UnboundTransaction, newCoins?, ttl?) → Promise<FinalizedTransaction>`

```typescript
// v3.0.0 - Simplified workflow
const finalizedTx = await walletProvider.balanceTx(unboundTx, newCoins, ttl);
await midnightProvider.submitTx(finalizedTx);
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

### Compact.js Integration (#370)
All contract interfacing is now executed via Compact.js, providing improved type safety and runtime integration.

### Ledger v7 Support (#414)
Updated to ledger-v7 with new `httpClientProvingProvider` for enhanced proving capabilities.

```typescript
import { httpClientProvingProvider } from '@midnight-ntwrk/http-client-proof-provider';

const provingProvider = httpClientProvingProvider(proverServerUri);
```

### Scoped Transactions (#404)
New `withContractScopedTransaction` utility for batching multiple circuit calls into a single transaction.

```typescript
import { withContractScopedTransaction } from '@midnight-ntwrk/midnight-js-contracts';

const result = await withContractScopedTransaction(providers, async (scope) => {
  await scope.call(contract, 'circuit1', [arg1]);
  await scope.call(contract, 'circuit2', [arg2]);
  // All calls submitted as single transaction
});
```

### KeyMaterialProvider Type (#430)
New type for DApp connector compatibility.

```typescript
interface ZkConfigProvider {
  asKeyMaterialProvider(): KeyMaterialProvider;
}
```

### Compact Compiler Update (#402)
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
- `@midnight-ntwrk/ledger-v7` (upgraded from ledger-v6)
- `@midnight-ntwrk/wallet-sdk-facade`: 1.0.0-beta.16
- `@midnight-ntwrk/compact-runtime`: updated for Compact.js integration

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

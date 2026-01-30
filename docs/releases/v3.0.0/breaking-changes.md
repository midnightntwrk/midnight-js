# Breaking Changes v3.0.0

## 1. LevelPrivateStateProvider Authentication Required (#342, #346)

### Reason
Improved security model requiring explicit authentication configuration for encrypted storage.

### Impact
All `LevelPrivateStateProvider` instantiations must provide either `walletProvider` or `privateStoragePasswordProvider`.

### Before
```typescript
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db'
});
```

### After
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

// Option 1: Using wallet provider
const provider = levelPrivateStateProvider({
  walletProvider: myWalletProvider
});

// Option 2: Using password provider
const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: async () => process.env.STORAGE_PASSWORD!
});
```

**Note:** Cannot provide both `walletProvider` and `privateStoragePasswordProvider` - pick one.

### Migration Steps
1. Identify all `LevelPrivateStateProvider` instances
2. Choose authentication method (wallet or password)
3. Add `walletProvider` or `privateStoragePasswordProvider` to configuration
4. Test encrypted storage access

---

## 2. WalletProvider.balanceTx Signature Change

### Reason
Simplified API - wallet now handles proving internally.

### Impact
- Input type changed from `UnprovenTransaction` to `UnboundTransaction`
- Return type changed to `FinalizedTransaction`
- Added optional `ttl` parameter

### Before
```typescript
const result = await walletProvider.balanceTx(unprovenTx);
```

### After
```typescript
const finalizedTx = await walletProvider.balanceTx(unboundTx, ttl);
await midnightProvider.submitTx(finalizedTx);
```

### Migration Steps
1. Update all `balanceTx` call sites to use `UnboundTransaction` input
2. Handle `FinalizedTransaction` return type directly

---

## 3. MidnightProvider.submitTx Now Async (#348)

### Reason
Transaction submission now supports indefinite waiting for finalization.

### Impact
`submitTx` signature changed from synchronous to asynchronous.

### Before
```typescript
function submitTransaction(tx: FinalizedTransaction): TransactionId {
  const txId = midnightProvider.submitTx(tx);
  return txId;
}
```

### After
```typescript
async function submitTransaction(tx: FinalizedTransaction): Promise<TransactionId> {
  const txId = await midnightProvider.submitTx(tx);
  return txId;
}
```

### Migration Steps
1. Add `async` to functions calling `submitTx`
2. Add `await` before `submitTx` and contract calls
3. Update return types to `Promise<T>`
4. Handle async errors with try/catch

---

## 4. Transaction Workflow Changes (#125)

### Reason
Ledger v7 introduces improved transaction workflow with proving recipes.

### Impact
Transaction submission now uses high-level functions that handle the proving workflow internally.

### Before
```typescript
// v2.1.0 - Manual workflow
const proof = await prover.prove(recipe);
const tx = createTransaction(proof);
const txId = await provider.submitTx(tx);
```

### After
```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';

const deployed = await deployContract(providers, {
  compiledContract: MyCompiledContract,
  privateStateId: 'myState',
  initialPrivateState: { ... }
});

// Call via deployed contract
const result = await deployed.callTx.myCircuit(args);
```

### Migration Steps
1. Create `CompiledContract` using `make().pipe()` pattern
2. Use `deployContract()` with `compiledContract` option
3. Call circuits via `deployed.callTx.circuitName()`
4. Proving is handled internally

---

## 5. ZswapOffer Return Type (#125)

### Reason
Improved data consistency by returning undefined for empty Zswap states.

### Impact
`zswapStateToOffer()` now returns `UnprovenOffer | undefined` instead of always returning `UnprovenOffer`.

### Before
```typescript
// v2.1.0 - Always returns UnprovenOffer
const offer = zswapStateToOffer(
  zswapLocalState,
  encryptionPublicKey
);
// offer is always defined
```

### After
```typescript
// v3.0.0 - Can return undefined
const offer = zswapStateToOffer(
  zswapLocalState,
  encryptionPublicKey
);

if (!offer) {
  // Handle empty Zswap state (no inputs/outputs/transients)
  return;
}

// Use offer
```

### Migration Steps
1. Locate all `zswapStateToOffer()` calls
2. Add undefined checks
3. Handle empty state scenarios appropriately

---

## 6. networkId Type Change (#125)

### Reason
Simplified network identification to support dynamic network configurations.

### Impact
`networkId` changed from enum to string type.

### Before
```typescript
import { NetworkId } from '@midnight-ntwrk/types';

const config = {
  networkId: NetworkId.Testnet
};
```

### After
```typescript
// Direct string - no enum import needed
const config = {
  networkId: 'testnet-02' // or 'devnet', 'undeployed', etc.
};
```

### Migration Steps
1. Remove `NetworkId` enum imports
2. Replace enum values with string literals
3. Update type annotations from `NetworkId` to `string`

---

## 7. Compact.js Contract Integration (#370)

### Reason
All contract interfacing now uses `@midnight-ntwrk/compact-js` for improved type safety.

### Impact
- `deployContract` options changed: `contract` → `compiledContract`, `privateStateKey` → `privateStateId`
- Contracts must be built using `CompiledContract.make().pipe()` pattern
- Witnesses require `WitnessContext` typing from `@midnight-ntwrk/compact-runtime`

### Before
```typescript
const deployed = await deployContract(providers, {
  contract: MyContract,
  privateStateKey: 'myState',
  initialPrivateState: { counter: 0 }
});
```

### After
```typescript
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import * as Compiled from './compiled/my-contract/contract/index.js';

const MyCompiledContract = CompiledContract.make<Compiled.Contract<MyState>>(
  'MyContract', Compiled.Contract<MyState>
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./compiled/my-contract')
);

const deployed = await deployContract(providers, {
  compiledContract: MyCompiledContract,
  privateStateId: 'myState',
  initialPrivateState: { counter: 0 }
});
```

### Migration Steps
1. Install `@midnight-ntwrk/compact-js`
2. Update witnesses to use `WitnessContext<Ledger, PrivateState>` typing
3. Create `CompiledContract` using `make().pipe()` pattern
4. Update `deployContract` calls: `contract` → `compiledContract`, `privateStateKey` → `privateStateId`

---

## Common Migration Issues

### Issue: Type Errors After Upgrade
**Solution:** Ensure TypeScript is version 5.0+ and all Midnight packages are v3.0.0.

### Issue: Async Errors
**Solution:** All transaction operations must be awaited. Check for missing `await` keywords.

### Issue: Storage Decryption Fails
**Solution:** Ensure password provider returns consistent password.

### Issue: Module Resolution
**Solution:** Clear node_modules and reinstall. Update bundler configuration for ESM/CJS.

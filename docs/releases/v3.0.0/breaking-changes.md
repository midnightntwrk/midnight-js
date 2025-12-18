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
// Option 1: Using wallet provider
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  walletProvider: myWalletProvider
});

// Option 2: Using password provider
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => process.env.STORAGE_PASSWORD!
});
```

### Migration Steps
1. Identify all `LevelPrivateStateProvider` instances
2. Choose authentication method (wallet or password)
3. Add `walletProvider` or `privateStoragePasswordProvider` to configuration
4. Test encrypted storage access

---

## 2. WalletProvider.balanceTx Return Type (#346)

### Reason
Support for new proving recipe types with better transaction handling.

### Impact
Return type is now `BalancedProvingRecipe` (union of three types).

### Before
```typescript
const recipe: BalancedProvingRecipe<MyState> = 
  await walletProvider.balanceTx(provingRecipe);
```

### After
```typescript
const recipe = await walletProvider.balanceTx(unprovenTx);

// Check the recipe type
if (recipe.type === 'TransactionToProve') {
  // Needs proving
  const provenTx = await prover.prove(recipe.transaction);
} else if (recipe.type === 'BalanceTransactionToProve') {
  // Needs balancing and proving
  const provenTx = await prover.prove(recipe.transactionToProve);
} else {
  // NothingToProve - ready to submit
  await provider.submitTx(recipe.transaction);
}
```

### Migration Steps
1. Update all `balanceTx` call sites
2. Add type discrimination logic
3. Handle all three recipe types appropriately

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
Ledger v6 introduces improved transaction workflow with proving recipes.

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
// v3.0.0 - Integrated workflow with submitDeployTx/submitCallTx
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';

const result = await submitCallTx(providers, {
  contract: myContract,
  circuit: 'myCircuit',
  args: [arg1, arg2]
});
```

### Migration Steps
1. Use `submitDeployTx()` for contract deployment
2. Use `submitCallTx()` for contract calls
3. These functions handle proving internally
4. No manual transaction creation needed

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

## Common Migration Issues

### Issue: Type Errors After Upgrade
**Solution:** Ensure TypeScript is version 5.0+ and all Midnight packages are v3.0.0.

### Issue: Async Errors
**Solution:** All transaction operations must be awaited. Check for missing `await` keywords.

### Issue: Storage Decryption Fails
**Solution:** Ensure password provider returns consistent password.

### Issue: Module Resolution
**Solution:** Clear node_modules and reinstall. Update bundler configuration for ESM/CJS.

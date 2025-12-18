# Breaking Changes v3.0.0

## 1. LevelPrivateStateProvider Authentication Required (#342, #346)

### Reason
Improved security model requiring explicit authentication configuration for encrypted storage.

### Impact
All `LevelPrivateStateProvider` instantiations must provide either `walletProvider` or `passwordProvider`.

### Before
```typescript
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data'
});
```

### After
```typescript
// Option 1: Using wallet provider
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  walletProvider: myWalletProvider
});

// Option 2: Using password provider
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  passwordProvider: async () => process.env.STORAGE_PASSWORD!
});
```

### Migration Steps
1. Identify all `LevelPrivateStateProvider` instances
2. Choose authentication method (wallet or password)
3. Add `walletProvider` or `passwordProvider` to configuration
4. Test encrypted storage access

---

## 2. WalletProvider.balanceTx Return Type (#346)

### Reason
Support for new balance transaction type with better type discrimination.

### Impact
Return type is now `BalancedProvingRecipe<T> | BalanceTransactionToProve`.

### Before
```typescript
const recipe: BalancedProvingRecipe<MyState> = 
  await walletProvider.balanceTx(provingRecipe);
```

### After
```typescript
const result = await walletProvider.balanceTx(provingRecipe);

if ('type' in result && result.type === 'BalanceTransactionToProve') {
  const txId = await submitBalanceTransaction(result);
} else {
  const proof = await prove(result);
}
```

### Migration Steps
1. Update all `balanceTx` call sites
2. Add type discrimination logic
3. Handle both result types appropriately

---

## 3. MidnightProvider.submitTx Now Async (#348)

### Reason
Transaction submission now supports indefinite waiting for finalization.

### Impact
`submitTx` signature changed from synchronous to asynchronous.

### Before
```typescript
function submitTransaction(tx: Transaction): TransactionId {
  const txId = midnightProvider.submitTx(tx);
  return txId;
}
```

### After
```typescript
async function submitTransaction(tx: Transaction): Promise<TransactionId> {
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

## 4. Unproven Transaction Types (#125)

### Reason
Ledger v6 introduces unproven transaction types for improved transaction workflow and proof management.

### Impact
Transaction creation now uses unproven types that must be proven before submission.

### Before
```typescript
// v2.1.0 - Direct transaction creation
const proof = await prover.prove(recipe);
const tx = createTransaction(proof);
const txId = await provider.submitTx(tx);
```

### After
```typescript
// v3.0.0 - Unproven transaction workflow
const unprovenTx = createUnprovenTransaction(recipe);
const provenTx = await prover.prove(unprovenTx);
const txId = await provider.submitTx(provenTx.transaction);
```

### Migration Steps
1. Update to `@midnight-ntwrk/ledger-v6` types
2. Use `createUnprovenTransaction()` instead of direct transaction creation
3. Prove unproven transactions before submission
4. Extract transaction from proven result

---

## 5. ZswapOffer Changes (#125)

### Reason
Empty ZswapOffer creation removed for data consistency and integrity.

### Impact
Cannot create ZswapOffer without valid offer data.

### Before
```typescript
// v2.1.0 - Empty offers allowed
const emptyOffer = createZswapOffer();
```

### After
```typescript
// v3.0.0 - Must provide offer data
const offer = createZswapOffer({
  amount: 100n,
  token: 'NIGHT',
  // ... other required fields
});
```

### Migration Steps
1. Review all ZswapOffer creation code
2. Ensure all offers have valid data
3. Remove any empty offer creation patterns

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


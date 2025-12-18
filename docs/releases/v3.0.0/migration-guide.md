# Migration Guide: v2.1.0 → v3.0.0

## Prerequisites

- Node.js 22 or higher
- TypeScript 5.0 or higher
- Review [Breaking Changes](./breaking-changes.md)

## Step-by-Step Migration

### Step 1: Update Dependencies

```bash
# Update midnight-js packages
yarn add @midnight-ntwrk/midnight-js@3.0.0-alpha.11

# Or for specific packages
yarn add @midnight-ntwrk/types@3.0.0-alpha.11 \
         @midnight-ntwrk/contracts@3.0.0-alpha.11 \
         @midnight-ntwrk/level-private-state-provider@3.0.0-alpha.11
```

### Step 2: Update Node.js Version

```bash
# Check Node.js version
node --version  # Must be >= 22

# Using nvm
nvm install 22
nvm use 22
```

### Step 3: Fix LevelPrivateStateProvider

#### v2.1.0
```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = new LevelPrivateStateProvider({
  storeDirectory: './data'
});
```

#### v3.0.0
```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

// Option A: Use wallet provider
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  walletProvider: myWalletProvider
});

// Option B: Use password provider (recommended)
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  passwordProvider: async () => process.env.STORAGE_PASSWORD!
});
```

### Step 4: Update WalletProvider.balanceTx Calls

#### v2.1.0
```typescript
const recipe = await walletProvider.balanceTx(provingRecipe);
const proof = await prover.prove(recipe);
```

#### v3.0.0
```typescript
const result = await walletProvider.balanceTx(provingRecipe);

// Add type discrimination
if ('type' in result && result.type === 'BalanceTransactionToProve') {
  // Handle balance transaction
  const txId = await midnightProvider.submitTx(result.transaction);
} else {
  // Handle proving recipe
  const proof = await prover.prove(result);
}
```

### Step 5: Make Transaction Submission Async

#### v2.1.0
```typescript
function processTransaction(tx: Transaction): TransactionId {
  const txId = midnightProvider.submitTx(tx);
  return txId;
}
```

#### v3.0.0
```typescript
async function processTransaction(tx: Transaction): Promise<TransactionId> {
  const txId = await midnightProvider.submitTx(tx);
  return txId;
}
```

### Step 6: Update Contract Calls

#### v2.1.0
```typescript
const result = myContract.call.transfer(from, to, amount);
processResult(result);
```

#### v3.0.0
```typescript
const result = await myContract.call.transfer(from, to, amount);
processResult(result);
```

### Step 4: Update CircuitContext Import

#### v2.1.0
```typescript
import { createCircuitContext } from '@midnight-ntwrk/compact';
```

#### v3.0.0
```typescript
import { createCircuitContext } from '@midnight-ntwrk/compact-runtime';
```

### Step 5: Adopt Unproven Transaction Types (#125)

#### v2.1.0
```typescript
const proof = await prover.prove(recipe);
const tx = createTransaction(proof);
const txId = await provider.submitTx(tx);
```

#### v3.0.0
```typescript
// Create unproven transaction
const unprovenTx = createUnprovenTransaction(recipe);

// Prove transaction
const provenTx = await prover.prove(unprovenTx);

// Submit proven transaction
const txId = await provider.submitTx(provenTx.transaction);
```

### Step 6: Use Unshielded Token APIs (Optional) (#125)

If working with NIGHT tokens:

```typescript
import { IndexerPublicDataProvider } from '@midnight-ntwrk/indexer-public-data-provider';

// Query unshielded balances
const balances = await provider.queryUnshieldedBalances(myAddress);
console.log('NIGHT balance:', balances[0].amount);

// Query multiple addresses
const addressBalances = await provider.getUnshieldedBalances([addr1, addr2]);
```

### Step 7: Update networkId Usage (#125)

#### v2.1.0
```typescript
import { NetworkId } from '@midnight-ntwrk/types';

const config = {
  networkId: NetworkId.Testnet
};
```

#### v3.0.0
```typescript
// No import needed - use string directly
const config = {
  networkId: 'testnet-02'
};
```

**Common networkId values:**
- `'mainnet'` - Production network
- `'testnet-02'` - Public testnet
- `'devnet'` - Development network
- `'undeployed'` - Local testing

## Complete Migration Example

### Before (v2.1.0)

```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = new LevelPrivateStateProvider({
  storeDirectory: './data'
});

function transfer(from: string, to: string, amount: bigint) {
  const recipe = walletProvider.balanceTx(provingRecipe);
  const proof = prover.prove(recipe);
  const tx = createTransaction(proof);
  const txId = midnightProvider.submitTx(tx);
  return txId;
}
```

### After (v3.0.0)

```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  passwordProvider: async () => process.env.STORAGE_PASSWORD!
});

async function transfer(
  from: string, 
  to: string, 
  amount: bigint
): Promise<TransactionId> {
  const result = await walletProvider.balanceTx(provingRecipe);
  
  if ('type' in result && result.type === 'BalanceTransactionToProve') {
    return await midnightProvider.submitTx(result.transaction);
  }
  
  const proof = await prover.prove(result);
  const tx = createTransaction(proof);
  const txId = await midnightProvider.submitTx(tx);
  return txId;
}
```

## Common Issues and Solutions

### Issue 1: Type Errors on walletProvider.balanceTx

**Solution:** Add type discrimination:
```typescript
const result = await walletProvider.balanceTx(recipe);
if ('type' in result && result.type === 'BalanceTransactionToProve') {
  // Handle BalanceTransactionToProve
} else {
  // Handle BalancedProvingRecipe
}
```

### Issue 2: Missing await on submitTx

**Solution:** Add await:
```typescript
const txId = await midnightProvider.submitTx(tx);
```

### Issue 3: LevelPrivateStateProvider Configuration

**Solution:**
```typescript
const provider = new LevelPrivateStateProvider({
  storeDirectory: './data',
  passwordProvider: async () => 'your-password'
});
```

### Issue 4: ZswapOffer Creation Fails (#125)

**Error:**
```
Cannot create empty ZswapOffer
```

**Solution:**
Provide required offer data:
```typescript
const offer = createZswapOffer({
  amount: 100n,
  token: 'NIGHT'
});
```

### Issue 5: Unproven Transaction Type Errors (#125)

**Error:**
```
Property 'transaction' does not exist on type 'UnprovenTransaction'
```

**Solution:**
Prove the transaction first:
```typescript
const unprovenTx = createUnprovenTransaction(recipe);
const provenTx = await prover.prove(unprovenTx);
const txId = await provider.submitTx(provenTx.transaction);
```

## Testing After Migration

```typescript
// Update test to handle async
test('submitTx returns TransactionId', async () => {
  const txId = await midnightProvider.submitTx(tx);
  expect(txId).toBeDefined();
});
```

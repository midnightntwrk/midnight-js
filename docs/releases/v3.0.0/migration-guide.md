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
yarn add @midnight-ntwrk/midnight-js-types@3.0.0-alpha.11 \
         @midnight-ntwrk/midnight-js-contracts@3.0.0-alpha.11 \
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
  midnightDbName: 'midnight-db'
});
```

#### v3.0.0
```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

// Option A: Use wallet provider
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  walletProvider: myWalletProvider
});

// Option B: Use password provider (recommended)
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => process.env.STORAGE_PASSWORD!
});
```

### Step 4: Update WalletProvider.balanceTx Calls

#### v2.1.0
```typescript
const recipe = await walletProvider.balanceTx(unprovenTx);
const proof = await prover.prove(recipe);
```

#### v3.0.0
```typescript
const recipe = await walletProvider.balanceTx(unprovenTx);

// Handle all three recipe types
if (recipe.type === 'TransactionToProve') {
  // Needs proving
  const provenTx = await prover.prove(recipe.transaction);
  await midnightProvider.submitTx(provenTx);
} else if (recipe.type === 'BalanceTransactionToProve') {
  // Needs balancing and proving
  const provenTx = await prover.prove(recipe.transactionToProve);
  await midnightProvider.submitTx(provenTx);
} else {
  // NothingToProve - ready to submit
  await midnightProvider.submitTx(recipe.transaction);
}
```

### Step 5: Make Transaction Submission Async

#### v2.1.0
```typescript
function processTransaction(tx: FinalizedTransaction): TransactionId {
  const txId = midnightProvider.submitTx(tx);
  return txId;
}
```

#### v3.0.0
```typescript
async function processTransaction(tx: FinalizedTransaction): Promise<TransactionId> {
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

### Step 7: Use High-Level Transaction Functions

#### v2.1.0
```typescript
const proof = await prover.prove(recipe);
const tx = createTransaction(proof);
const txId = await provider.submitTx(tx);
```

#### v3.0.0
```typescript
// Use submitDeployTx for deployments
import { submitDeployTx } from '@midnight-ntwrk/midnight-js-contracts';

const result = await submitDeployTx(providers, {
  contract: myContract,
  initialState: { /* ... */ }
});

// Use submitCallTx for contract calls
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';

const result = await submitCallTx(providers, {
  contract: myContract,
  circuit: 'myCircuit',
  args: [arg1, arg2]
});
```

### Step 8: Update networkId Usage (#125)

#### v2.1.0
```typescript
import { NetworkId } from '@midnight-ntwrk/midnight-js-types';

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
  midnightDbName: 'midnight-db'
});

function transfer(from: string, to: string, amount: bigint) {
  const recipe = walletProvider.balanceTx(unprovenTx);
  const proof = prover.prove(recipe);
  const tx = createTransaction(proof);
  const txId = midnightProvider.submitTx(tx);
  return txId;
}
```

### After (v3.0.0)

```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';

const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => process.env.STORAGE_PASSWORD!
});

async function transfer(
  from: string, 
  to: string, 
  amount: bigint
): Promise<TransactionId> {
  const result = await submitCallTx(providers, {
    contract: myContract,
    circuit: 'transfer',
    args: [from, to, amount]
  });
  
  return result.txId;
}
```

## Common Issues and Solutions

### Issue 1: Type Errors on walletProvider.balanceTx

**Solution:** Handle all three recipe types:
```typescript
const recipe = await walletProvider.balanceTx(unprovenTx);

if (recipe.type === 'TransactionToProve') {
  // Handle TransactionToProve
} else if (recipe.type === 'BalanceTransactionToProve') {
  // Handle BalanceTransactionToProve
} else {
  // Handle NothingToProve
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
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => 'your-password'
});
```

### Issue 4: ZswapOffer Undefined

**Error:**
```
Cannot read property 'inputs' of undefined
```

**Solution:**
Check for undefined:
```typescript
const offer = zswapStateToOffer(state, encKey);
if (!offer) {
  console.log('Empty Zswap state');
  return;
}
```

## Testing After Migration

```typescript
// Update test to handle async
test('submitTx returns TransactionId', async () => {
  const txId = await midnightProvider.submitTx(tx);
  expect(txId).toBeDefined();
});
```

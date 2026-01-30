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
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

// Option A: Use wallet provider
const provider = levelPrivateStateProvider({
  walletProvider: myWalletProvider
});

// Option B: Use password provider
const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: async () => process.env.STORAGE_PASSWORD!
});
```

**Note:** Pick one of `walletProvider` or `privateStoragePasswordProvider`, not both.

### Step 4: Update WalletProvider.balanceTx Calls

#### v2.1.0
```typescript
const result = await walletProvider.balanceTx(unprovenTx);
```

#### v3.0.0
```typescript
// Wallet handles proving internally, returns FinalizedTransaction
const finalizedTx = await walletProvider.balanceTx(unboundTx, ttl);
await midnightProvider.submitTx(finalizedTx);
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

### Step 7: Migrate to Compact.js Contract Pattern (#370)

This is a **major change**. Contracts are now defined using the `CompiledContract` builder from `@midnight-ntwrk/compact-js`.

#### v2.1.0
```typescript
import { Contract } from '@midnight-ntwrk/midnight-js-contracts';
import CounterContract from './contract';

const witnesses = {
  privateIncrement: (privateState) => [
    { privateCounter: privateState.privateCounter + 1 },
    []
  ]
};

const contract = new Contract(CounterContract, witnesses);
const deployed = await deployContract(providers, {
  contract,
  privateStateKey: 'counterPrivateState',
  initialPrivateState: { privateCounter: 0 }
});
```

#### v3.0.0
```typescript
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import * as CompiledCounter from './compiled/counter/contract/index.js';
import type { Ledger } from './compiled/counter/contract/index.js';

// 1. Define private state type
type CounterPrivateState = {
  privateCounter: number;
};

// 2. Define witnesses with WitnessContext for proper typing
const witnesses = {
  privateIncrement: ({
    privateState
  }: WitnessContext<Ledger, CounterPrivateState>): [CounterPrivateState, []] => [
    { privateCounter: privateState.privateCounter + 1 },
    []
  ]
};

// 3. Create compiled contract using fluent API
const CompiledCounterContract = CompiledContract.make<
  CompiledCounter.Contract<CounterPrivateState>
>('Counter', CompiledCounter.Contract<CounterPrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./compiled/counter')
);

// 4. Deploy using new API
const deployed = await deployContract(providers, {
  compiledContract: CompiledCounterContract,
  privateStateId: 'counterPrivateState',
  initialPrivateState: { privateCounter: 0 }
});

// 5. Call contract methods
const result = await deployed.callTx.increment();
```

**Key changes:**
- Import `CompiledContract` from `@midnight-ntwrk/compact-js`
- Import `WitnessContext` from `@midnight-ntwrk/compact-runtime`
- Use `CompiledContract.make().pipe()` to build contract definition
- Witnesses now use `WitnessContext<Ledger, PrivateState>` for typing
- `deployContract` uses `compiledContract` instead of `contract`
- `deployContract` uses `privateStateId` instead of `privateStateKey`

### Step 8: Use High-Level Transaction Functions

#### v2.1.0
```typescript
const proof = await prover.prove(recipe);
const tx = createTransaction(proof);
const txId = await provider.submitTx(tx);
```

#### v3.0.0
```typescript
// Use deployContract with compiledContract
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';

const deployed = await deployContract(providers, {
  compiledContract: MyCompiledContract,
  privateStateId: 'myState',
  initialPrivateState: { ... }
});

// Call via deployed contract
const result = await deployed.callTx.myCircuit(arg1, arg2);
```

### Step 9: Update networkId Usage (#125)

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
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/compact-js';

const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: async () => process.env.STORAGE_PASSWORD!
});

// Create compiled contract
const MyCompiledContract = CompiledContract.make<...>(...).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('./compiled/my-contract')
);

// Deploy and call
const deployed = await deployContract(providers, {
  compiledContract: MyCompiledContract,
  privateStateId: 'myState',
  initialPrivateState: { ... }
});

const result = await deployed.callTx.transfer(from, to, amount);
```

## Common Issues and Solutions

### Issue 1: Type Errors on walletProvider.balanceTx

**Solution:** Update to use the new signature:
```typescript
const finalizedTx = await walletProvider.balanceTx(unboundTx, ttl);
await midnightProvider.submitTx(finalizedTx);
```

### Issue 2: Missing await on submitTx

**Solution:** Add await:
```typescript
const txId = await midnightProvider.submitTx(tx);
```

### Issue 3: LevelPrivateStateProvider Configuration

**Solution:**
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = levelPrivateStateProvider({
  walletProvider: myWallet  // OR privateStoragePasswordProvider
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

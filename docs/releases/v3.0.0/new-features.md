# New Features v3.0.0

## 1. Configurable Password Provider

Flexible password management for encrypted storage with wallet fallback.

### TypeScript Signature
```typescript
type PrivateStoragePasswordProvider = () => Promise<string>;

interface LevelPrivateStateProviderConfig {
  readonly midnightDbName: string;
  readonly privateStateStoreName: string;
  readonly signingKeyStoreName: string;
  readonly walletProvider?: WalletProvider;
  readonly privateStoragePasswordProvider?: PrivateStoragePasswordProvider;
}
```

### Usage
```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

// Basic password provider
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => process.env.STORAGE_PASSWORD!
});

// With environment-based selection
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'midnight-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => {
    if (process.env.NODE_ENV === 'production') {
      return await fetchFromSecretManager();
    }
    return 'dev-password';
  }
});
```

### Benefits
- Decouples storage encryption from wallet
- Enables custom password management
- Supports secure secret managers
- Provides flexible fallback strategies

---

## 2. Async Transaction Handling (#348)

Transaction submission and contract calls now support asynchronous execution.

### TypeScript Signatures
```typescript
interface MidnightProvider {
  submitTx(transaction: FinalizedTransaction): Promise<TransactionId>;
}

interface Contract<T> {
  call: {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
      ? (...args: A) => Promise<R>
      : never;
  };
}
```

### Usage
```typescript
// Transaction submission
const txId = await midnightProvider.submitTx(transaction);
console.log(`Transaction submitted: ${txId}`);

// Contract calls
const result = await contract.call.transfer({
  from: address1,
  to: address2,
  amount: 100n
});

// With error handling
try {
  const txId = await midnightProvider.submitTx(transaction);
  await waitForFinalization(txId);
} catch (error) {
  console.error('Transaction failed:', error);
}
```

---

## 3. Storage Encryption

AES-256-GCM encryption for private state storage.

### Usage
```typescript
const provider = new LevelPrivateStateProvider({
  midnightDbName: 'encrypted-db',
  privateStateStoreName: 'private-states',
  signingKeyStoreName: 'signing-keys',
  privateStoragePasswordProvider: async () => crypto.randomBytes(32).toString('hex')
});

// Storage is automatically encrypted/decrypted
await provider.set('key', sensitiveData);
const data = await provider.get('key');
```

### Security Features
- AES-256-GCM encryption
- Authenticated encryption
- Per-entry encryption
- Password-based key derivation

---

## 4. BalancedProvingRecipe Types (#320)

Enhanced proving recipe system with three distinct types.

### TypeScript Signatures
```typescript
export const TRANSACTION_TO_PROVE = 'TransactionToProve';
export const BALANCE_TRANSACTION_TO_PROVE = 'BalanceTransactionToProve';
export const NOTHING_TO_PROVE = 'NothingToProve';

export type TransactionToProve = {
  readonly type: typeof TRANSACTION_TO_PROVE;
  readonly transaction: UnprovenTransaction;
};

export type BalanceTransactionToProve<TTransaction> = {
  readonly type: typeof BALANCE_TRANSACTION_TO_PROVE;
  readonly transactionToProve: UnprovenTransaction;
  readonly transactionToBalance: TTransaction;
};

export type NothingToProve<TTransaction> = {
  readonly type: typeof NOTHING_TO_PROVE;
  readonly transaction: TTransaction;
};

export type ProvingRecipe<TTransaction> =
  | TransactionToProve
  | BalanceTransactionToProve<TTransaction>
  | NothingToProve<TTransaction>;

export type BalancedProvingRecipe = ProvingRecipe<UnprovenTransaction | FinalizedTransaction>;
```

### Usage
```typescript
const recipe = await walletProvider.balanceTx(unprovenTx);

if (recipe.type === TRANSACTION_TO_PROVE) {
  console.log('Transaction needs proving');
  const provenTx = await prover.prove(recipe.transaction);
  await midnightProvider.submitTx(provenTx);
} else if (recipe.type === BALANCE_TRANSACTION_TO_PROVE) {
  console.log('Transaction needs balancing and proving');
  const provenTx = await prover.prove(recipe.transactionToProve);
  await midnightProvider.submitTx(provenTx);
} else {
  console.log('Transaction ready to submit');
  await midnightProvider.submitTx(recipe.transaction);
}
```

---

## 5. Compact Compiler 0.27.0 (#373)

Updated Compact compiler with enhanced features.

### Changes
- Improved type inference
- Better error messages
- Enhanced circuit optimization
- Updated compact-runtime integration

---

## 6. Uint8Array Circuit Results (#268)

Binary circuit result support for improved performance.

### TypeScript Signature
```typescript
interface CircuitContext {
  parseCircuitResult(data: Uint8Array): CircuitResult;
  createCircuitContext(): CircuitContext;
}
```

### Usage
```typescript
import { createCircuitContext } from '@midnight-ntwrk/compact-runtime';

const context = createCircuitContext();
const binaryResult = new Uint8Array([/* circuit output */]);
const parsed = context.parseCircuitResult(binaryResult);
```

### Benefits
- Reduced memory allocation
- Faster serialization
- Better performance for large circuits

---

## 7. ESM/CJS Dual Package Support

Fixed module resolution for both ESM and CommonJS.

### Usage
```typescript
// ESM
import { MidnightProvider } from '@midnight-ntwrk/midnight-js-types';

// CommonJS
const { MidnightProvider } = require('@midnight-ntwrk/midnight-js-types');
```

### Benefits
- Works with all bundlers (Webpack, Rollup, esbuild)
- Proper TypeScript module resolution
- Better tree-shaking support

---

## 8. Unshielded Token Support (#125)

Support for NIGHT (unshielded) public tokens on Midnight network.

### TypeScript Signatures
```typescript
interface UnshieldedBalances {
  [address: string]: bigint;
}

interface IndexerPublicDataProvider {
  queryUnshieldedBalances(
    contractAddress: ContractAddress,
    config?: QueryConfigOptions
  ): Promise<UnshieldedBalances | null>;
}
```

### Usage
```typescript
import { IndexerPublicDataProvider } from '@midnight-ntwrk/indexer-public-data-provider';

// Query unshielded balances for a contract
const balances = await provider.queryUnshieldedBalances(contractAddress);

if (balances) {
  for (const [address, amount] of Object.entries(balances)) {
    console.log(`${address}: ${amount} NIGHT`);
  }
}
```

### Benefits
- Public token support (NIGHT)
- Balance queries for unshielded tokens
- Integration with Cardano ecosystem
- Transparent governance token handling

---

## 9. High-Level Transaction Functions (#125)

Simplified transaction workflow with integrated proving.

### TypeScript Signatures
```typescript
async function submitDeployTx<C extends Contract>(
  providers: SubmitTxProviders,
  options: DeployTxOptions<C>
): Promise<FinalizedTxData>;

async function submitCallTx<C extends Contract, ICK extends ImpureCircuitId<C>>(
  providers: SubmitTxProviders,
  options: CallTxOptions<C, ICK>
): Promise<FinalizedTxData>;
```

### Usage
```typescript
import { submitDeployTx, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';

// Deploy a contract
const deployResult = await submitDeployTx(providers, {
  contract: myContract,
  initialState: { balance: 0n }
});

// Call a contract method
const callResult = await submitCallTx(providers, {
  contract: myContract,
  circuit: 'transfer',
  args: [fromAddress, toAddress, amount]
});

console.log('Transaction ID:', callResult.txId);
```

### Benefits
- Clearer transaction lifecycle
- Integrated proving workflow
- Type-safe transaction handling
- Improved error handling

---

## 10. Transaction TTL Support (#125)

Configure transaction time-to-live via `balanceTx` for expiry management.

### TypeScript Signature
```typescript
interface WalletProvider {
  balanceTx(
    tx: UnprovenTransaction, 
    newCoins?: ShieldedCoinInfo[], 
    ttl?: Date  // Optional expiry time
  ): Promise<BalancedProvingRecipe>;
}
```

### Usage
```typescript
// Set 10-minute TTL
const recipe = await walletProvider.balanceTx(
  unprovenTx,
  newCoins,
  new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
);

// No TTL (default)
const recipe = await walletProvider.balanceTx(unprovenTx);
```

### Benefits
- Prevent stale transaction submission
- Network resource optimization
- Better transaction lifecycle management

---

## Feature Comparison Matrix

| Feature | v2.1.0 | v3.0.0 |
|---------|---------|-----------------|
| Password Provider | ❌ | ✅ |
| Async Transactions | ❌ | ✅ |
| Storage Encryption | ❌ | ✅ |
| Proving Recipe Types | ❌ | ✅ (3 types) |
| Uint8Array Results | ❌ | ✅ |
| ESM/CJS Support | Partial | ✅ |
| Unshielded Tokens | ❌ | ✅ |
| High-Level TX Functions | ❌ | ✅ |
| Transaction TTL | ❌ | ✅ |

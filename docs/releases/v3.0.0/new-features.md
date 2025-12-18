# New Features v3.0.0

## 1. Configurable Password Provider

Flexible password management for encrypted storage with wallet fallback.

### TypeScript Signature
```typescript
interface PasswordProviderConfig {
  passwordProvider: () => Promise<string>;
  walletProvider?: WalletProvider;
}

class LevelPrivateStateProvider {
  constructor(config: {
    storeDirectory: string;
    passwordProvider?: () => Promise<string>;
    walletProvider?: WalletProvider;
  });
}
```

### Usage
```typescript
import { LevelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

// Basic password provider
const provider = new LevelPrivateStateProvider({
  storeDirectory: './private-data',
  passwordProvider: async () => process.env.STORAGE_PASSWORD!
});

// With environment-based selection
const provider = new LevelPrivateStateProvider({
  storeDirectory: './private-data',
  passwordProvider: async () => {
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
  submitTx(transaction: Transaction): Promise<TransactionId>;
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
  storeDirectory: './encrypted-data',
  passwordProvider: async () => crypto.randomBytes(32).toString('hex')
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

## 4. BalanceTransactionToProve (#320)

New transaction type for explicit balance operations.

### TypeScript Signature
```typescript
type BalanceTransactionToProve = {
  type: 'BalanceTransactionToProve';
  transaction: Transaction;
  metadata: {
    requiredBalance: bigint;
    availableBalance: bigint;
  };
};

type WalletProviderResult<T> = 
  | BalancedProvingRecipe<T>
  | BalanceTransactionToProve;
```

### Usage
```typescript
const result = await walletProvider.balanceTx(recipe);

if ('type' in result && result.type === 'BalanceTransactionToProve') {
  console.log('Required:', result.metadata.requiredBalance);
  console.log('Available:', result.metadata.availableBalance);
  
  const txId = await midnightProvider.submitTx(result.transaction);
} else {
  const proof = await prover.prove(result);
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
import { MidnightProvider } from '@midnight-ntwrk/types';

// CommonJS
const { MidnightProvider } = require('@midnight-ntwrk/types');
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
interface UnshieldedBalance {
  address: string;
  amount: bigint;
  token: 'NIGHT';
}

interface IndexerPublicDataProvider {
  queryUnshieldedBalances(address: string): Promise<UnshieldedBalance[]>;
  getUnshieldedBalances(addresses: string[]): Promise<Map<string, UnshieldedBalance>>;
}
```

### Usage
```typescript
import { IndexerPublicDataProvider } from '@midnight-ntwrk/indexer-public-data-provider';

// Query single address unshielded balance
const balances = await provider.queryUnshieldedBalances(myAddress);
console.log('NIGHT balance:', balances[0].amount);

// Query multiple addresses
const addressBalances = await provider.getUnshieldedBalances([addr1, addr2]);
for (const [address, balance] of addressBalances) {
  console.log(`${address}: ${balance.amount} NIGHT`);
}
```

### Benefits
- Public token support (NIGHT)
- Balance queries for unshielded tokens
- Integration with Cardano ecosystem
- Transparent governance token handling

---

## 9. Unproven Transaction Types (#125)

New transaction type system for better workflow control with ledger v6.

### TypeScript Signatures
```typescript
type UnprovenTransaction = {
  type: 'Unproven';
  recipe: TransactionRecipe;
};

type ProvenTransaction = {
  type: 'Proven';
  proof: Proof;
  transaction: Transaction;
};

function createUnprovenTransaction(recipe: TransactionRecipe): UnprovenTransaction;
function prove(unproven: UnprovenTransaction): Promise<ProvenTransaction>;
```

### Usage
```typescript
import { createUnprovenTransaction } from '@midnight-ntwrk/types';

// Create unproven transaction
const unprovenTx = createUnprovenTransaction(recipe);

// Prove transaction
const provenTx = await prover.prove(unprovenTx);

// Submit proven transaction
const txId = await provider.submitTx(provenTx.transaction);
```

### Benefits
- Clearer transaction lifecycle
- Better proof management
- Type-safe transaction workflow
- Improved error handling

---

## 10. Transaction TTL Configuration (#125)

Configure transaction time-to-live for expiry management.

### TypeScript Signatures
```typescript
interface TransactionConfig {
  ttl?: number; // Time-to-live in seconds
}

function createTransaction(
  proof: Proof, 
  config?: TransactionConfig
): Transaction;
```

### Usage
```typescript
// Set 10-minute TTL
const tx = createTransaction(proof, {
  ttl: 600 // 10 minutes
});

// Default TTL (no expiry)
const tx = createTransaction(proof);
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
| Balance Transaction Type | ❌ | ✅ |
| Uint8Array Results | ❌ | ✅ |
| ESM/CJS Support | Partial | ✅ |
| Unshielded Tokens | ❌ | ✅ |
| Unproven Types | ❌ | ✅ |
| Transaction TTL | ❌ | ✅ |

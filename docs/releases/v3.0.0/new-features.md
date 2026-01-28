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

## 4. Compact.js Integration (#370)

All contract interfacing is now executed via Compact.js.

### Benefits
- Improved type safety with Compact.js runtime
- Better integration between TypeScript and Compact contracts
- Simplified contract interaction patterns

### Usage
```typescript
import { Contract } from '@midnight-ntwrk/midnight-js-contracts';

// Contract types are now generated via Compact.js
const contract = new Contract<MyContractType>(contractAddress);
const result = await contract.call.myCircuit(args);
```

---

## 5. Ledger v7 Support (#414)

Updated to ledger-v7 with new proving provider.

### TypeScript Signature
```typescript
import { httpClientProvingProvider } from '@midnight-ntwrk/http-client-proof-provider';

function httpClientProvingProvider(proverServerUri: string): ProvingProvider;
```

### Usage
```typescript
const provingProvider = httpClientProvingProvider('http://localhost:6300');
```

### Benefits
- Enhanced proving capabilities
- Improved performance
- Better error handling

---

## 6. Scoped Transactions (#404)

New utility for batching multiple circuit calls into a single transaction.

### TypeScript Signature
```typescript
async function withContractScopedTransaction<T>(
  providers: ContractProviders,
  fn: (scope: TransactionScope) => Promise<T>
): Promise<T>;
```

### Usage
```typescript
import { withContractScopedTransaction } from '@midnight-ntwrk/midnight-js-contracts';

const result = await withContractScopedTransaction(providers, async (scope) => {
  await scope.call(contract, 'circuit1', [arg1]);
  await scope.call(contract, 'circuit2', [arg2]);
  // All calls are batched into a single transaction
  return someResult;
});
```

### Benefits
- Atomic multi-circuit operations
- Reduced transaction overhead
- Cleaner code for complex workflows

---

## 7. KeyMaterialProvider Type (#430)

New type for DApp connector compatibility.

### TypeScript Signature
```typescript
interface ZkConfigProvider {
  asKeyMaterialProvider(): KeyMaterialProvider;
}
```

### Usage
```typescript
const keyMaterialProvider = zkConfigProvider.asKeyMaterialProvider();
```

### Benefits
- DApp connector integration
- Standardized key material handling

---

## 8. Compact Compiler Update (#402)

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

## 13. Transaction TTL Support (#125)

Configure transaction time-to-live via `balanceTx` for expiry management.

### TypeScript Signature
```typescript
interface WalletProvider {
  balanceTx(
    tx: UnboundTransaction,
    newCoins?: ShieldedCoinInfo[],
    ttl?: Date  // Optional expiry time
  ): Promise<FinalizedTransaction>;
}
```

### Usage
```typescript
// Set 10-minute TTL
const finalizedTx = await walletProvider.balanceTx(
  unboundTx,
  newCoins,
  new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
);

// No TTL (default)
const finalizedTx = await walletProvider.balanceTx(unboundTx);
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
| Compact.js Integration | ❌ | ✅ |
| Ledger v7 | ❌ | ✅ |
| Scoped Transactions | ❌ | ✅ |
| KeyMaterialProvider | ❌ | ✅ |
| Uint8Array Results | ❌ | ✅ |
| ESM/CJS Support | Partial | ✅ |
| Unshielded Tokens | ❌ | ✅ |
| High-Level TX Functions | ❌ | ✅ |
| Transaction TTL | ❌ | ✅ |

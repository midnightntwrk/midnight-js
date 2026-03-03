# New Features v3.2.0

## 1. Enhanced URL Handling in HTTP Client Proving Provider (#575)

The `httpClientProvingProvider` now properly handles URLs with existing paths and query parameters.

### Problem Solved
Previously, when providing a URL with an existing path (e.g., `https://prover.example.com/api/v1/`), the path would be overwritten by the endpoint paths (`/check`, `/prove`). Now the paths are correctly appended.

### Usage
```typescript
import { httpClientProvingProvider } from '@midnight-ntwrk/http-client-proof-provider';

// URLs with paths are now handled correctly
const provider = httpClientProvingProvider(
  'https://prover.example.com/api/v1/',
  zkConfigProvider
);

// Results in endpoints:
// - https://prover.example.com/api/v1/check
// - https://prover.example.com/api/v1/prove
```

### Trailing Slash Handling
The implementation normalizes trailing slashes to prevent double slashes:
- `https://example.com/api/` → `https://example.com/api/check`
- `https://example.com/api` → `https://example.com/api/check`

---

## 2. Multi-Version Encryption (#530)

Enhanced encryption with versioned format and increased security.

### V2 Encryption Specifications

| Parameter          | V1 (Legacy)    | V2 (Current)   |
| ------------------ | -------------- | -------------- |
| Algorithm          | AES-256-GCM    | AES-256-GCM    |
| Key Derivation     | PBKDF2-SHA256  | PBKDF2-SHA256  |
| Iterations         | 100,000        | **600,000**    |
| Salt Length        | 32 bytes       | 32 bytes       |
| IV Length          | 12 bytes       | 12 bytes       |
| Auth Tag Length    | 16 bytes       | 16 bytes       |

### Automatic Migration
V1-encrypted data is automatically migrated to V2 when read or during password rotation.

---

## 3. Signing Key Export/Import (#526)

Export and import signing keys with AES-256-GCM encryption.

### Export Signing Keys
```typescript
const keysExport = await provider.exportSigningKeys({
  password: 'export-password' // Optional, uses storage password if not provided
});

// Save to file
fs.writeFileSync('keys-backup.json', JSON.stringify(keysExport));
```

### Import Signing Keys
```typescript
const keysExport = JSON.parse(fs.readFileSync('keys-backup.json', 'utf-8'));

const result = await provider.importSigningKeys(keysExport, {
  password: 'export-password',
  conflictStrategy: 'skip' // 'skip' | 'overwrite' | 'error'
});

console.log(`Imported: ${result.imported}`);
console.log(`Skipped: ${result.skipped}`);
console.log(`Overwritten: ${result.overwritten}`);
```

### Export Format
```typescript
interface SigningKeyExport {
  format: 'midnight-signing-key-export';
  encryptedPayload: string; // Base64 AES-256-GCM encrypted JSON
  salt: string; // Hex-encoded 32 bytes
}
```

---

## 4. Private State Export/Import (#526)

Export and import private states with the same security features.

### Export Private States
```typescript
provider.setContractAddress(contractAddress);

const statesExport = await provider.exportPrivateStates({
  password: 'export-password',
  maxStates: 1000 // Optional limit, defaults to 10000
});
```

### Import Private States
```typescript
const result = await provider.importPrivateStates(statesExport, {
  password: 'export-password',
  conflictStrategy: 'overwrite',
  maxStates: 1000
});
```

### Export Format
```typescript
interface PrivateStateExport {
  format: 'midnight-private-state-export';
  encryptedPayload: string;
  salt: string;
}
```

---

## 5. Secure Password Rotation (#542)

Rotate encryption passwords with atomic batch writes and automatic V1 to V2 migration.

### Rotate Private State Password
```typescript
provider.setContractAddress(contractAddress);

const result = await provider.changePassword(
  () => 'old-password',
  () => 'new-password',
  { maxEntries: 1000 } // Optional limit
);

console.log(`Re-encrypted: ${result.entriesProcessed}`);
console.log(`Migrated V1→V2: ${result.entriesMigrated}`);
```

### Rotate Signing Keys Password
```typescript
const result = await provider.changeSigningKeysPassword(
  () => 'old-password',
  () => 'new-password'
);
```

### Password Rotation Options
```typescript
interface PasswordRotationOptions {
  maxEntries?: number;   // Limit entries to process (default: unlimited)
  timeout?: number;      // Lock timeout in ms (default: 5 minutes)
}

interface PasswordRotationResult {
  entriesProcessed: number;
  entriesMigrated: number; // V1→V2 migrations
}
```

### Concurrency Safety
- Rotation locks prevent concurrent read/write during password change
- Lock timeout defaults to 5 minutes
- Operations wait for rotation to complete before proceeding

---

## 6. Account-Scoped Storage Isolation (#545)

Each account gets isolated storage namespaces for enhanced security and data separation.

### Configuration
```typescript
const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => 'password',
  accountId: walletAddress // SHA-256 hashed for storage paths
});
```

### Storage Structure
```
LevelDB (midnight-level-db)
├── private-states:{hashedAccountId}
│   ├── __midnight_encryption_metadata__
│   └── {contractAddress}:{privateStateId}
└── signing-keys:{hashedAccountId}
    ├── __midnight_encryption_metadata__
    └── {contractAddress}
```

### Migration from Unscoped Storage
```typescript
import { migrateToAccountScoped } from '@midnight-ntwrk/level-private-state-provider';

const result = await migrateToAccountScoped({
  accountId: walletAddress,
  // Optional: custom database name
  midnightDbName: 'midnight-level-db'
});

console.log(`Private states migrated: ${result.privateStatesMigrated}`);
console.log(`Signing keys migrated: ${result.signingKeysMigrated}`);
```

---

## 7. Encryption Cache Management (#538)

Encryption keys are cached to avoid repeated PBKDF2 derivation (600,000 iterations).

### Manual Cache Invalidation
```typescript
provider.invalidateEncryptionCache();
```

### Automatic Invalidation
Cache is automatically invalidated:
- After `changePassword()` completes
- After `changeSigningKeysPassword()` completes

---

## 8. Scoped Transaction Identity Validation (#555)

Prevents silent state mismatches when batching contract calls.

### New Error Type
```typescript
class ScopedTransactionIdentityMismatchError extends Error {
  readonly cached: { contractAddress: string; privateStateId?: string };
  readonly requested: { contractAddress: string; privateStateId?: string };
}
```

### How It Works
When using `withContractScopedTransaction`, the system tracks which contract and private state ID the cached states belong to. If a subsequent call attempts to use a different contract or state ID, an error is thrown.

```typescript
import { withContractScopedTransaction } from '@midnight-ntwrk/midnight-js-contracts';

// This will throw ScopedTransactionIdentityMismatchError
await withContractScopedTransaction(providers, async (scope) => {
  await scope.call(contractA, 'circuit1', [args]); // Caches states for contractA
  await scope.call(contractB, 'circuit2', [args]); // Error: different contract
});
```

---

## 9. Mnemonic-Based Wallet in Testkit (#524)

New helpers for creating wallets from mnemonics in test environments.

### Using Custom Mnemonic
```typescript
import { FluentWalletBuilder } from '@midnight-ntwrk/testkit';

const wallet = new FluentWalletBuilder()
  .withMnemonic('abandon abandon abandon ... about')
  .build();
```

### Using Predefined Test Wallet
```typescript
const testWallet = new FluentWalletBuilder()
  .withTestWallet()
  .build();
```

### Direct Helper Function
```typescript
import { fromMnemonic } from '@midnight-ntwrk/testkit';

const wallet = fromMnemonic('your mnemonic phrase here');
```

---

## 10. Browser Storage Warning (#526)

Automatic console warning when using LevelDB in browser environments.

### Warning Message
```
WARNING: Using LevelDB in browser environment.
Data is stored in IndexedDB and may be lost if the user clears browser data.
Consider implementing a backup/export strategy for important data.
```

### Environment Detection
The warning triggers when both `window` and `document` are defined, indicating a browser environment.

# ⚠️ WARNING

> RISK: This provider lacks a recovery mechanism.
> Clearing browser cache or deleting local files permanently destroys the private state (contract state/keys).
> For assets with real-world value, this may result in irreversible financial loss.
> DO NOT use for production applications requiring data persistence.
---

# What is this?
An implementation of a private state provider that works with LevelDB compatible data stores.

This package provides **encrypted storage** for private states and signing keys using AES-256-GCM encryption.

This package was created for the [Midnight network](https://midnight.network).

Please visit the [Midnight Developer Hub](https://midnight.network/developer-hub) to learn more.

## Usage

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => 'your-secure-password-here',
  accountId: walletAddress // Required: unique identifier for the account/wallet
});
```

The `accountId` parameter is **required** and scopes all storage operations to prevent cross-account data access. Use the wallet address or any unique identifier for the account.

## Architecture

### Storage Structure

```
LevelDB (midnight-level-db)
├── private-states:{hashedAccountId}   ← Account-scoped private state sublevel
│   ├── __midnight_encryption_metadata__  (salt, version)
│   └── {contractAddress}:{privateStateId}  (encrypted state data)
│
└── signing-keys:{hashedAccountId}     ← Account-scoped signing key sublevel
    ├── __midnight_encryption_metadata__  (salt, version)
    └── {contractAddress}  (encrypted signing key)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                levelPrivateStateProvider()                      │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ Password     │───►│ StorageEncryption│◄───│ Encryption    │  │
│  │ Provider     │    │ (PBKDF2 + AES)   │    │ Cache         │  │
│  └──────────────┘    └──────────────────┘    └───────────────┘  │
│          │                    │                     ▲           │
│          │                    ▼                     │           │
│          │           ┌──────────────────┐           │           │
│          │           │ withSubLevel()   │───────────┘           │
│          │           │ (LevelDB wrapper)│                       │
│          │           └──────────────────┘                       │
│          │                    │                                 │
│          ▼                    ▼                                 │
│  ┌──────────────┐    ┌──────────────────┐                       │
│  │ Rotation     │    │ Account-scoped   │                       │
│  │ Lock         │    │ Sublevels        │                       │
│  └──────────────┘    └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Description |
|-----------|-------------|
| `levelPrivateStateProvider()` | Factory function returning PrivateStateProvider instance |
| `StorageEncryption` | AES-256-GCM encryption with PBKDF2 key derivation |
| `encryptionCache` | Module-level cache avoiding repeated key derivation |
| `passwordRotationLocks` | Concurrent access protection during password changes |
| `superjson` | Type-preserving serialization (Buffer, BigInt, Uint8Array) |

## Configuration

```typescript
interface LevelPrivateStateProviderConfig {
  midnightDbName?: string;           // Default: 'midnight-level-db'
  privateStateStoreName?: string;    // Default: 'private-states'
  signingKeyStoreName?: string;      // Default: 'signing-keys'
  privateStoragePasswordProvider: PrivateStoragePasswordProvider;  // Required
  accountId: string;                 // Required
}
```

## Security

### Account Isolation

Each account's data is stored in a separate namespace, preventing one account from accessing another's private states or signing keys. The `accountId` is hashed using SHA-256 (first 32 hex characters) before being used in storage paths, so wallet addresses are not exposed in the storage layer.

### Encryption at Rest

**All data is encrypted by default** using AES-256-GCM with PBKDF2 key derivation.

### Encryption Specification

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2-SHA256 |
| Iterations (V2) | 600,000 |
| Iterations (V1) | 100,000 (legacy, auto-migrates) |
| Salt Length | 32 bytes |
| IV Length | 12 bytes |
| Auth Tag Length | 16 bytes |
| Encoding | Base64 |

### Password Requirements

| Requirement | Value |
|-------------|-------|
| Minimum length | 16 characters |
| Character classes | 3+ of: uppercase, lowercase, digits, special |
| Consecutive repeats | Max 3 identical characters |
| Sequential patterns | Not allowed (e.g., '1234', 'abcd') |

### Data Protection

This provider encrypts:
- Private contract states
- Signing keys
- All sensitive user data

### Migration from Unencrypted Storage

If you have existing unencrypted data:
1. Start your application
2. Unencrypted data will be automatically encrypted on first read
3. All new writes are encrypted immediately

**No data loss occurs during migration.**

### Password Rotation

The provider supports secure password rotation for both private states and signing keys:

```typescript
const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => currentPassword,
  accountId: walletAddress
});

// Set contract address first (required for private state rotation)
provider.setContractAddress(contractAddress);

// Rotate password for private states
await provider.changePassword(
  () => 'old-password-here',
  () => 'new-password-here'
);

// Rotate password for signing keys (separate method)
await provider.changeSigningKeysPassword(
  () => 'old-password-here',
  () => 'new-password-here'
);
```

**Key features:**
- Atomic operation using LevelDB batch writes (all-or-nothing)
- Verifies old password can decrypt existing data before migration
- Re-encrypts all data in the store with new password
- Invalidates encryption cache after successful rotation
- Concurrent access protection: read/write operations wait for rotation to complete
- Automatic V1→V2 encryption format migration during rotation

**Important notes:**
- For `changePassword()`, you must call `setContractAddress()` first
- Both passwords must meet the password requirements above
- The operation reads all data into memory before writing (suitable for typical use cases)
- `changePassword()` re-encrypts ALL data in the private state store (not just the current contract's data) because all entries share the same encryption salt. This is by design to maintain encryption consistency.

### Encryption Caching

The provider caches derived encryption keys to avoid expensive PBKDF2 key derivation (600,000 iterations) on every operation. Without caching, each `get()`, `set()`, `getSigningKey()`, or `setSigningKey()` call would require key derivation, causing significant latency.

**How it works:**
- First operation derives the key from password + salt (slow, ~600ms)
- Subsequent operations reuse the cached key (fast, <1ms)
- Cache is keyed by database name and store name

```typescript
const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => password,
  accountId: walletAddress
});

// All these operations benefit from caching
await provider.set('state1', data);    // First call: derives key
await provider.set('state2', data);    // Cached: instant
await provider.get('state1');          // Cached: instant

// Manually invalidate when needed
provider.invalidateEncryptionCache();
```

**When to invalidate:**
- After external password changes (if password is managed outside the provider)
- When switching users or password sources at runtime
- In testing scenarios to ensure fresh state between tests

**Automatic invalidation:**
- `changePassword()` and `changeSigningKeysPassword()` automatically invalidate the cache

**Note:** The cache has no size limit. For typical usage with a small number of database/store combinations, this is acceptable. If using dynamic database names, call `invalidateEncryptionCache()` periodically to prevent unbounded memory growth.

## Export & Import

The provider supports exporting and importing private states and signing keys for backup or migration purposes.

### Export Private States

```typescript
const exportData = await provider.exportPrivateStates({
  password: 'export-password'  // Optional: uses storage password if not provided
});

// exportData contains: { salt, encryptedStates, stateCount }
```

### Import Private States

```typescript
const result = await provider.importPrivateStates(exportData, {
  password: 'export-password',      // Must match export password
  conflictStrategy: 'skip'          // 'skip' | 'overwrite' | 'error'
});

console.log(`Imported ${result.statesImported} states`);
```

### Export/Import Signing Keys

```typescript
// Export
const keyExport = await provider.exportSigningKeys({
  password: 'export-password'
});

// Import
const result = await provider.importSigningKeys(keyExport, {
  password: 'export-password',
  conflictStrategy: 'skip'
});
```

## Migration from Unscoped Storage

If you have existing data from a previous version without account scoping, use the `migrateToAccountScoped` function to migrate data to the new account-scoped location:

```typescript
import { migrateToAccountScoped } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const result = await migrateToAccountScoped({
  accountId: walletAddress
});

console.log(`Migrated ${result.privateStatesMigrated} private states`);
console.log(`Migrated ${result.signingKeysMigrated} signing keys`);
```

**Important notes:**
- The migration **copies** data to the new scoped location but **preserves** the original data for safe rollback
- Running migration multiple times is safe but will re-copy all data
- After confirming successful migration, you may manually clear the old unscoped data to free storage space

## API Reference

### Provider Methods

| Method | Description |
|--------|-------------|
| `get(privateStateId)` | Get private state by ID |
| `set(privateStateId, state)` | Store private state |
| `remove(privateStateId)` | Remove private state |
| `clear()` | Clear all private states for current contract |
| `setContractAddress(address)` | Set current contract context |
| `getSigningKey(address)` | Get signing key for contract |
| `setSigningKey(address, key)` | Store signing key |
| `removeSigningKey(address)` | Remove signing key |
| `clearSigningKeys()` | Clear all signing keys |
| `exportPrivateStates(options?)` | Export encrypted states |
| `importPrivateStates(data, options?)` | Import encrypted states |
| `exportSigningKeys(options?)` | Export encrypted keys |
| `importSigningKeys(data, options?)` | Import encrypted keys |
| `changePassword(oldProvider, newProvider)` | Rotate private state password |
| `changeSigningKeysPassword(oldProvider, newProvider)` | Rotate signing key password |
| `invalidateEncryptionCache()` | Clear cached encryption keys |

### Exported Utilities

```typescript
import {
  levelPrivateStateProvider,
  migrateToAccountScoped,
  StorageEncryption,
  decryptValue,
  DEFAULT_CONFIG,
  type LevelPrivateStateProviderConfig,
  type PrivateStoragePasswordProvider,
  type PasswordRotationResult,
  type PasswordRotationOptions,
  type MigrationResult
} from '@midnight-ntwrk/midnight-js-level-private-state-provider';
```

## Error Handling

### Password Errors

```
Error: Password must be at least 16 characters long. Current length: X
Error: Password must contain at least 3 of: uppercase letters, lowercase letters, digits, special characters
Error: Password contains too many repeated characters (more than 3 identical in a row)
Error: Password contains sequential patterns (e.g., '1234', 'abcd')
```

### Rotation Errors

```
Error: Timed out waiting for password rotation lock on "{key}". Another rotation may be stuck or taking longer than 300000ms.
```

### Decryption Errors

```
Error: Salt mismatch: data was encrypted with a different password
Error: Unsupported encryption version: X
```

# Agree to Terms
By downloading and using this image, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf), which includes the [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

# License
The software provided herein is licensed under the [Apache License V2.0](http://www.apache.org/licenses/LICENSE-2.0).

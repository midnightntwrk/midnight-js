# ⚠️ WARNING

> RISK: This provider lacks a recovery mechanism.
> Clearing browser cache or deleting local files permanently destroys the private state (contract state/keys).
> For assets with real-world value, this may result in irreversible financial loss.
> DO NOT use for production applications requiring data persistence.
---

# Level Private State Provider

Encrypted LevelDB storage for Midnight private states and signing keys.

## Installation

```bash
yarn add @midnight-ntwrk/midnight-js-level-private-state-provider
```

## Quick Start

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => 'your-secure-password',
  accountId: walletAddress
});

provider.setContractAddress(contractAddress);
await provider.set('stateId', privateStateData);
const state = await provider.get('stateId');
```

## Configuration

| Option                           | Required | Default             | Description                            |
| -------------------------------- | -------- | ------------------- | -------------------------------------- |
| `privateStoragePasswordProvider` | ✓        | -                   | Function returning encryption password |
| `accountId`                      | ✓        | -                   | Unique identifier (e.g., wallet address) |
| `midnightDbName`                 |          | `midnight-level-db` | Database name                          |
| `privateStateStoreName`          |          | `private-states`    | Store name for states                  |
| `signingKeyStoreName`            |          | `signing-keys`      | Store name for keys                    |

## Security

### Encryption

All data is encrypted using **AES-256-GCM** with **PBKDF2-SHA256** key derivation (600,000 iterations).

### Password Requirements

- Minimum 16 characters
- At least 3 character types (uppercase, lowercase, digits, special)
- No more than 3 consecutive identical characters
- No sequential patterns (e.g., `1234`, `abcd`)

### Account Isolation

Each `accountId` creates isolated storage namespaces. The ID is SHA-256 hashed before use in storage paths.

## API

### Private States

```typescript
provider.setContractAddress(address);      // Set contract context (required)
await provider.get(privateStateId);        // Read state
await provider.set(privateStateId, state); // Write state
await provider.remove(privateStateId);     // Delete state
await provider.clear();                    // Clear all states for contract
```

### Signing Keys

```typescript
await provider.getSigningKey(contractAddress);
await provider.setSigningKey(contractAddress, key);
await provider.removeSigningKey(contractAddress);
await provider.clearSigningKeys();
```

### Password Rotation

```typescript
// Rotate private state password
provider.setContractAddress(contractAddress);
await provider.changePassword(
  () => 'old-password',
  () => 'new-password'
);

// Rotate signing keys password
await provider.changeSigningKeysPassword(
  () => 'old-password',
  () => 'new-password'
);
```

Password rotation is atomic—all data is re-encrypted or none is.

### Export/Import

```typescript
// Export
const statesExport = await provider.exportPrivateStates({ password: 'export-pw' });
const keysExport = await provider.exportSigningKeys({ password: 'export-pw' });

// Import
await provider.importPrivateStates(statesExport, {
  password: 'export-pw',
  conflictStrategy: 'skip' // 'skip' | 'overwrite' | 'error'
});
await provider.importSigningKeys(keysExport, {
  password: 'export-pw',
  conflictStrategy: 'skip'
});
```

### Cache Management

Encryption keys are cached to avoid repeated PBKDF2 derivation. Invalidate manually when needed:

```typescript
provider.invalidateEncryptionCache();
```

Cache is automatically invalidated after password rotation.

## Migration

### From Unscoped Storage

```typescript
import { migrateToAccountScoped } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const result = await migrateToAccountScoped({ accountId: walletAddress });
// Original data is preserved for rollback
```

### From Unencrypted Storage

Unencrypted data is automatically encrypted on first read. No action required.

## Exports

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
  type MigrationResult
} from '@midnight-ntwrk/midnight-js-level-private-state-provider';
```

## Detailed

### Storage Structure

```
LevelDB (midnight-level-db)
├── private-states:{hashedAccountId}
│   ├── __midnight_encryption_metadata__  (salt, version)
│   └── {contractAddress}:{privateStateId}  (encrypted state)
│
└── signing-keys:{hashedAccountId}
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

| Component                       | Description                                            |
| ------------------------------- | ------------------------------------------------------ |
| `levelPrivateStateProvider()`   | Factory returning PrivateStateProvider instance        |
| `StorageEncryption`             | AES-256-GCM encryption with PBKDF2 key derivation      |
| `encryptionCache`               | Module-level cache avoiding repeated key derivation    |
| `passwordRotationLocks`         | Concurrent access protection during password changes   |
| `superjson`                     | Type-preserving serialization (Buffer, BigInt, Uint8Array) |

### Encryption Specification

| Parameter          | Value           |
| ------------------ | --------------- |
| Algorithm          | AES-256-GCM     |
| Key Derivation     | PBKDF2-SHA256   |
| Iterations (V2)    | 600,000         |
| Iterations (V1)    | 100,000 (legacy, auto-migrates) |
| Salt Length        | 32 bytes        |
| IV Length          | 12 bytes        |
| Auth Tag Length    | 16 bytes        |
| Encoding           | Base64          |

## Resources

- [Midnight Network](https://midnight.network)
- [Developer Hub](https://midnight.network/developer-hub)

## Terms & License

By using this package, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf) and [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

Licensed under [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).

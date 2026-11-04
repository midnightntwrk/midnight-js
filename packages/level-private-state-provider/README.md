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
  accountId: walletProvider.getCoinPublicKey()
});

const states = provider.forContract(contractAddress);
await states.set('stateId', privateStateData);
const state = await states.get('stateId');
```

## Configuration

| Option                           | Required | Default             | Description                            |
| -------------------------------- | -------- | ------------------- | -------------------------------------- |
| `privateStoragePasswordProvider` | ✓        | -                   | Function returning encryption password |
| `accountId`                      | ✓        | -                   | The wallet's coin public key, `walletProvider.getCoinPublicKey()`, for a new store. Keep an existing store's value |
| `midnightDbName`                 |          | `midnight-level-db` | Database name                          |
| `privateStateStoreName`          |          | `private-states`    | Store name for states                  |
| `signingKeyStoreName`            |          | `signing-keys`      | Store name for keys                    |
| `cryptoBackend` | | auto-detected (`'webcrypto'` if available, else `'noble'`) | `'webcrypto' \| 'noble'`. Auto-detects Web Crypto availability; set explicitly to force a backend (e.g. `'noble'` in Node.js tests, or `'webcrypto'` for explicit browser intent). Added in #827. |
| `levelFactory` | | `(dbName) => new Level(dbName, { createIfMissing: true })` | `LevelFactory`. Custom storage factory. The `level` package auto-selects `browser-level` (IndexedDB) or `classic-level` (Node.js) based on bundler target. |

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

For a new store, use the wallet's coin public key, `walletProvider.getCoinPublicKey()`, as it is.
For an existing store, keep the `accountId` it was created with: another value opens another,
empty store. The private states and signing keys stored under the old value stay in the database,
but this provider no longer reads them.

Contract addresses are compared in lower case, for private states and for signing keys.

### Concurrency

Within one JavaScript process, operations on the same `midnightDbName` run one at a time, in call order.
This is what keeps a password rotation from racing a write.

An operation that needs the password holds its place in that order until `privateStoragePasswordProvider`
resolves, so a slow provider (for example, one waiting for user input) delays every later operation on
the database. The provider must not call this provider itself: the call waits behind the operation that
asked for the password and never completes.

Use one database from **one process or one browser tab only**:

- **Node.js** — a second process opening the same database fails with a LevelDB lock error.
- **Browser** — IndexedDB takes no lock, so a second tab is not refused. Two tabs writing to one
  database while either rotates the password can store data that can no longer be decrypted.

## API

### Private States

Private states are reached per contract. A view is fixed to one contract address, so operations
for different contracts never mix, even when they run at the same time.

```typescript
const states = provider.forContract(contractAddress);
await states.get(privateStateId);        // Read state
await states.set(privateStateId, state); // Write state
await states.remove(privateStateId);     // Delete state
await states.clear();                    // Clear all states of this contract

await provider.clearAll();               // Clear the states of every contract of this account
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
// Rotate the private state password of every contract of this account
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
// Export the states of one contract
const statesExport = await provider.forContract(contractAddress).exportPrivateStates({ password: 'export-pw' });
const keysExport = await provider.exportSigningKeys({ password: 'export-pw' });

// Import
await provider.forContract(contractAddress).importPrivateStates(statesExport, {
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

const result = await migrateToAccountScoped({ accountId: walletProvider.getCoinPublicKey() });
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
  timingSafeEqual,
  DEFAULT_CONFIG,
  type LevelPrivateStateProviderConfig,
  type PrivateStoragePasswordProvider,
  type PasswordRotationResult,
  type MigrationResult
} from '@midnight-ntwrk/midnight-js-level-private-state-provider';
```

---

### `timingSafeEqual`

Compares two `Buffer`s or `Uint8Array`s in constant time. If the inputs differ in length, returns false immediately (not constant-time for length mismatch). This matches the Node.js native `timingSafeEqual` behavior (which throws on length mismatch). For fixed-length buffers (e.g., hashes), this is safe. When used with variable-length buffers, you should be aware of potential timing leakage.


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

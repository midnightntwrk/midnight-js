# API Changes Reference v3.2.0

## Package: @midnight-ntwrk/level-private-state-provider

### Modified Exports

#### LevelPrivateStateProviderConfig

**v3.1.0:**
```typescript
interface LevelPrivateStateProviderConfig {
  readonly midnightDbName?: string;
  readonly privateStateStoreName?: string;
  readonly signingKeyStoreName?: string;
  readonly walletProvider?: WalletProvider; // Supported
  readonly privateStoragePasswordProvider?: PrivateStoragePasswordProvider;
}
```

**v3.2.0:**
```typescript
interface LevelPrivateStateProviderConfig {
  readonly midnightDbName?: string;
  readonly privateStateStoreName?: string;
  readonly signingKeyStoreName?: string;
  // walletProvider REMOVED
  readonly privateStoragePasswordProvider: PrivateStoragePasswordProvider; // Required
  readonly accountId: string; // NEW - Required
}
```

**Breaking:** `walletProvider` removed, `privateStoragePasswordProvider` and `accountId` now required.

### New Exports

#### migrateToAccountScoped (#545)

```typescript
function migrateToAccountScoped(options: {
  accountId: string;
  midnightDbName?: string;
  privateStateStoreName?: string;
  signingKeyStoreName?: string;
}): Promise<MigrationResult>;

interface MigrationResult {
  privateStatesMigrated: number;
  signingKeysMigrated: number;
}
```

**Usage:**
```typescript
import { migrateToAccountScoped } from '@midnight-ntwrk/level-private-state-provider';

const result = await migrateToAccountScoped({ accountId: walletAddress });
```

#### PasswordRotationOptions / PasswordRotationResult (#542)

```typescript
interface PasswordRotationOptions {
  maxEntries?: number;
  timeout?: number;
}

interface PasswordRotationResult {
  entriesProcessed: number;
  entriesMigrated: number;
}
```

### New Methods on LevelPrivateStateProvider

#### changePassword (#542)

```typescript
changePassword(
  oldPasswordProvider: PrivateStoragePasswordProvider,
  newPasswordProvider: PrivateStoragePasswordProvider,
  options?: PasswordRotationOptions
): Promise<PasswordRotationResult>;
```

#### changeSigningKeysPassword (#542)

```typescript
changeSigningKeysPassword(
  oldPasswordProvider: PrivateStoragePasswordProvider,
  newPasswordProvider: PrivateStoragePasswordProvider,
  options?: PasswordRotationOptions
): Promise<PasswordRotationResult>;
```

#### invalidateEncryptionCache (#538)

```typescript
invalidateEncryptionCache(): void;
```

#### exportPrivateStates (#526)

```typescript
exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport>;
```

#### importPrivateStates (#526)

```typescript
importPrivateStates(
  exportData: PrivateStateExport,
  options?: ImportPrivateStatesOptions
): Promise<ImportPrivateStatesResult>;
```

#### exportSigningKeys (#526)

```typescript
exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport>;
```

#### importSigningKeys (#526)

```typescript
importSigningKeys(
  exportData: SigningKeyExport,
  options?: ImportSigningKeysOptions
): Promise<ImportSigningKeysResult>;
```

---

## Package: @midnight-ntwrk/midnight-js-types

### New Types (#526)

#### PrivateStateExport

```typescript
interface PrivateStateExport {
  readonly format: 'midnight-private-state-export';
  readonly encryptedPayload: string;
  readonly salt: string;
}
```

#### SigningKeyExport

```typescript
interface SigningKeyExport {
  readonly format: 'midnight-signing-key-export';
  readonly encryptedPayload: string;
  readonly salt: string;
}
```

#### ExportPrivateStatesOptions

```typescript
interface ExportPrivateStatesOptions {
  readonly password?: string;
  readonly maxStates?: number;
}
```

#### ImportPrivateStatesOptions

```typescript
interface ImportPrivateStatesOptions {
  readonly password?: string;
  readonly conflictStrategy?: 'skip' | 'overwrite' | 'error';
  readonly maxStates?: number;
}
```

#### ImportPrivateStatesResult

```typescript
interface ImportPrivateStatesResult {
  readonly imported: number;
  readonly skipped: number;
  readonly overwritten: number;
}
```

#### ExportSigningKeysOptions

```typescript
interface ExportSigningKeysOptions {
  readonly password?: string;
  readonly maxKeys?: number;
}
```

#### ImportSigningKeysOptions

```typescript
interface ImportSigningKeysOptions {
  readonly password?: string;
  readonly conflictStrategy?: 'skip' | 'overwrite' | 'error';
  readonly maxKeys?: number;
}
```

#### ImportSigningKeysResult

```typescript
interface ImportSigningKeysResult {
  readonly imported: number;
  readonly skipped: number;
  readonly overwritten: number;
}
```

### New Error Classes

#### PrivateStateExportError

```typescript
class PrivateStateExportError extends Error {
  constructor(message: string);
}
```

#### SigningKeyExportError

```typescript
class SigningKeyExportError extends Error {
  constructor(message: string);
}
```

#### PrivateStateImportError

```typescript
type PrivateStateImportErrorCause = 'decryption_failed' | 'invalid_format' | 'conflict' | 'unknown';

class PrivateStateImportError extends Error {
  readonly cause?: PrivateStateImportErrorCause;
  constructor(message: string, cause?: PrivateStateImportErrorCause);
}
```

#### ExportDecryptionError

```typescript
class ExportDecryptionError extends PrivateStateImportError {
  constructor(); // Fixed message about wrong password or corrupted data
}
```

#### InvalidExportFormatError

```typescript
class InvalidExportFormatError extends PrivateStateImportError {
  constructor(message?: string);
}
```

#### ImportConflictError

```typescript
class ImportConflictError extends PrivateStateImportError {
  readonly conflictCount: number;
  constructor(conflictCount: number, entityName?: string);
}
```

### Constants

```typescript
const MAX_EXPORT_STATES = 10000;
const MAX_EXPORT_SIGNING_KEYS = 10000;
```

---

## Package: @midnight-ntwrk/midnight-js-contracts

### New Error Classes (#555)

#### ScopedTransactionIdentityMismatchError

```typescript
class ScopedTransactionIdentityMismatchError extends Error {
  readonly cached: { contractAddress: string; privateStateId?: PrivateStateId };
  readonly requested: { contractAddress: string; privateStateId?: PrivateStateId };

  constructor(
    cached: { contractAddress: string; privateStateId?: PrivateStateId },
    requested: { contractAddress: string; privateStateId?: PrivateStateId }
  );
}
```

**Usage context:** Thrown when `withContractScopedTransaction` detects a mismatch between cached states and the requested contract identity.

---

## Package: @midnight-ntwrk/testkit

### New Exports (#524)

#### fromMnemonic

```typescript
function fromMnemonic(mnemonic: string): Wallet;
```

### FluentWalletBuilder New Methods (#524)

```typescript
class FluentWalletBuilder {
  withMnemonic(mnemonic: string): FluentWalletBuilder;
  withTestWallet(): FluentWalletBuilder;
}
```

---

## Package: @midnight-ntwrk/compact

### Removed Parameters (#523)

#### fetchCompact

**v3.1.0:**
```typescript
interface FetchCompactOptions {
  uri: string;
  authToken?: string; // Supported
}
```

**v3.2.0:**
```typescript
interface FetchCompactOptions {
  uri: string;
  // authToken REMOVED
}
```

---

## Complete API Diff by Package

### @midnight-ntwrk/level-private-state-provider

```diff
  interface LevelPrivateStateProviderConfig {
    readonly midnightDbName?: string;
    readonly privateStateStoreName?: string;
    readonly signingKeyStoreName?: string;
-   readonly walletProvider?: WalletProvider;
-   readonly privateStoragePasswordProvider?: PrivateStoragePasswordProvider;
+   readonly privateStoragePasswordProvider: PrivateStoragePasswordProvider;
+   readonly accountId: string;
  }

+ function migrateToAccountScoped(options): Promise<MigrationResult>;
+ interface MigrationResult { ... }
+ interface PasswordRotationOptions { ... }
+ interface PasswordRotationResult { ... }

  // New methods on provider instance
+ changePassword(...): Promise<PasswordRotationResult>;
+ changeSigningKeysPassword(...): Promise<PasswordRotationResult>;
+ invalidateEncryptionCache(): void;
+ exportPrivateStates(...): Promise<PrivateStateExport>;
+ importPrivateStates(...): Promise<ImportPrivateStatesResult>;
+ exportSigningKeys(...): Promise<SigningKeyExport>;
+ importSigningKeys(...): Promise<ImportSigningKeysResult>;
```

### @midnight-ntwrk/midnight-js-types

```diff
+ interface PrivateStateExport { ... }
+ interface SigningKeyExport { ... }
+ interface ExportPrivateStatesOptions { ... }
+ interface ImportPrivateStatesOptions { ... }
+ interface ImportPrivateStatesResult { ... }
+ interface ExportSigningKeysOptions { ... }
+ interface ImportSigningKeysOptions { ... }
+ interface ImportSigningKeysResult { ... }
+ class PrivateStateExportError extends Error { ... }
+ class SigningKeyExportError extends Error { ... }
+ class PrivateStateImportError extends Error { ... }
+ class ExportDecryptionError extends PrivateStateImportError { ... }
+ class InvalidExportFormatError extends PrivateStateImportError { ... }
+ class ImportConflictError extends PrivateStateImportError { ... }
+ const MAX_EXPORT_STATES = 10000;
+ const MAX_EXPORT_SIGNING_KEYS = 10000;
```

### @midnight-ntwrk/midnight-js-contracts

```diff
+ class ScopedTransactionIdentityMismatchError extends Error { ... }
```

### @midnight-ntwrk/testkit

```diff
+ function fromMnemonic(mnemonic: string): Wallet;
+ FluentWalletBuilder.withMnemonic(mnemonic: string): FluentWalletBuilder;
+ FluentWalletBuilder.withTestWallet(): FluentWalletBuilder;
```

### @midnight-ntwrk/compact

```diff
  interface FetchCompactOptions {
    uri: string;
-   authToken?: string;
  }
```

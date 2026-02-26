# Migration Guide v3.1.0 to v3.2.0

## Overview

This guide covers migrating from midnight-js v3.1.0 to v3.2.0. The main changes involve:
1. LevelPrivateStateProvider configuration changes
2. Account-scoped storage migration
3. Auth token removal from compact fetch

## Step 1: Update Dependencies

```bash
yarn upgrade @midnight-ntwrk/level-private-state-provider@^3.2.0
yarn upgrade @midnight-ntwrk/midnight-js-contracts@^3.2.0
yarn upgrade @midnight-ntwrk/midnight-js-types@^3.2.0
yarn upgrade @midnight-ntwrk/compact@^3.2.0
```

## Step 2: Update LevelPrivateStateProvider Configuration

### 2.1 Replace walletProvider with privateStoragePasswordProvider

**Before (v3.1.0):**
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = levelPrivateStateProvider({
  walletProvider: myWalletProvider
});
```

**After (v3.2.0):**
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => process.env.STORAGE_PASSWORD!,
  accountId: walletAddress
});
```

### 2.2 Password Requirements

Ensure your password meets these requirements:
- Minimum 16 characters
- At least 3 character types (uppercase, lowercase, digits, special)
- No more than 3 consecutive identical characters
- No sequential patterns (e.g., `1234`, `abcd`)

Example of a compliant password function:
```typescript
const privateStoragePasswordProvider = () => {
  const password = process.env.STORAGE_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error('Storage password must be at least 16 characters');
  }
  return password;
};
```

### 2.3 Choose Account ID

The `accountId` should be a stable, unique identifier for each user:
```typescript
// Recommended: Use wallet address
const accountId = walletAddress;

// Alternative: Use user ID from your auth system
const accountId = user.id;
```

## Step 3: Migrate Existing Data to Account-Scoped Storage

If you have existing data from v3.1.0, migrate it to account-scoped storage:

```typescript
import { migrateToAccountScoped } from '@midnight-ntwrk/level-private-state-provider';

async function migrateExistingData(walletAddress: string) {
  try {
    const result = await migrateToAccountScoped({
      accountId: walletAddress
    });

    console.log(`Migration complete:`);
    console.log(`  Private states: ${result.privateStatesMigrated}`);
    console.log(`  Signing keys: ${result.signingKeysMigrated}`);

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration before creating provider
await migrateExistingData(walletAddress);

const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => password,
  accountId: walletAddress
});
```

### Migration Notes
- Original data is preserved (not deleted) for rollback capability
- Migration is idempotent - running it multiple times is safe
- Migration handles both private states and signing keys

## Step 4: Remove Auth Token from Compact Fetch

If you're using `fetchCompact` with an auth token, remove it:

**Before (v3.1.0):**
```typescript
const compiled = await fetchCompact({
  uri: 'https://example.com/contract',
  authToken: 'my-auth-token'
});
```

**After (v3.2.0):**
```typescript
const compiled = await fetchCompact({
  uri: 'https://example.com/contract'
});
```

If authentication is still required, handle it at the infrastructure level (proxy, API gateway, etc.).

## Step 5: Update Error Handling (Optional)

Add handling for new error types if using export/import or scoped transactions:

```typescript
import {
  ExportDecryptionError,
  InvalidExportFormatError,
  ImportConflictError,
  ScopedTransactionIdentityMismatchError
} from '@midnight-ntwrk/midnight-js-types';

try {
  await provider.importPrivateStates(exportData, { password });
} catch (error) {
  if (error instanceof ExportDecryptionError) {
    console.error('Wrong password or corrupted data');
  } else if (error instanceof InvalidExportFormatError) {
    console.error('Invalid export format');
  } else if (error instanceof ImportConflictError) {
    console.error(`${error.conflictCount} conflicts detected`);
  }
}

try {
  await withContractScopedTransaction(providers, async (scope) => {
    // ...
  });
} catch (error) {
  if (error instanceof ScopedTransactionIdentityMismatchError) {
    console.error(`Cannot batch calls to different contracts`);
    console.error(`Cached: ${error.cached.contractAddress}`);
    console.error(`Requested: ${error.requested.contractAddress}`);
  }
}
```

## Step 6: Leverage New Features (Optional)

### 6.1 Export/Import for Backup

```typescript
// Export signing keys for backup
const keysBackup = await provider.exportSigningKeys({
  password: 'backup-password'
});
fs.writeFileSync('keys-backup.json', JSON.stringify(keysBackup));

// Later, restore from backup
const backup = JSON.parse(fs.readFileSync('keys-backup.json', 'utf-8'));
await provider.importSigningKeys(backup, {
  password: 'backup-password',
  conflictStrategy: 'skip'
});
```

### 6.2 Password Rotation

```typescript
// Rotate password periodically for security
await provider.changePassword(
  () => currentPassword,
  () => newPassword
);
```

### 6.3 Encryption Cache Management

```typescript
// Invalidate cache if password changes externally
provider.invalidateEncryptionCache();
```

## Step 7: Testing

Run your test suite to verify the migration:

```bash
yarn test
```

### Test Checklist

- [ ] Provider initialization works with new config
- [ ] Private states can be read/written
- [ ] Signing keys can be read/written
- [ ] Contract deployment works
- [ ] Contract calls work
- [ ] Scoped transactions work
- [ ] (If applicable) Data migrated successfully

## Troubleshooting

### Error: "accountId is required"

Add `accountId` to your provider configuration:
```typescript
levelPrivateStateProvider({
  privateStoragePasswordProvider: () => password,
  accountId: walletAddress // Add this
});
```

### Error: "Password does not meet security requirements"

Ensure your password has:
- 16+ characters
- At least 3 types: uppercase, lowercase, digits, special characters

### Error: "Failed to decrypt"

This can happen if:
1. Wrong password provided
2. Data was encrypted with a different password
3. Data is corrupted

If migrating from v3.1.0, ensure you're using the same password as before.

### Existing data not accessible after upgrade

Run the migration utility:
```typescript
await migrateToAccountScoped({ accountId: walletAddress });
```

### Performance degradation after upgrade

V2 encryption uses 600,000 PBKDF2 iterations vs 100,000 in V1. This is intentional for security. The encryption cache mitigates repeated operations:
- First operation: ~1-2 seconds for key derivation
- Subsequent operations: Instant (cached)

If cache is being invalidated unexpectedly, check for:
- Password provider returning different values
- Explicit `invalidateEncryptionCache()` calls

## Rollback Plan

If you need to rollback to v3.1.0:

1. The migration preserves original data, so v3.1.0 can still access it
2. Downgrade packages:
   ```bash
   yarn add @midnight-ntwrk/level-private-state-provider@3.1.0
   ```
3. Revert configuration to use `walletProvider` if previously used

Note: Data written with v3.2.0 (V2 encryption) cannot be read by v3.1.0.

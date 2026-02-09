# Migration Guide: v3.0.0 → v3.1.0

## Prerequisites

- Node.js 22 or higher
- TypeScript 5.0 or higher
- Review [Breaking Changes](./breaking-changes.md)

## Important Notice

`@midnight-ntwrk/midnight-js-level-private-state-provider` is now **deprecated** and marked as **NOT FOR COMMERCIAL USE**.

This package uses browser localStorage or Node.js file storage - **losing private state by clearing browser cache could be financially ruinous**.

## Step-by-Step Migration

### Step 1: Update Dependencies

```bash
# Update midnight-js packages
yarn add @midnight-ntwrk/midnight-js-level-private-state-provider@3.1.0
yarn add @midnight-ntwrk/midnight-js-contracts@3.1.0
```

### Step 2: Acknowledge Deprecation Warning

When installing, you will see a deprecation warning:

```
npm WARN deprecated @midnight-ntwrk/midnight-js-level-private-state-provider:
This package is deprecated. It uses browser localStorage or Node.js file storage
which is not suitable for production use.
```

**For development/testing:** You may continue using the package.
**For production:** Plan to implement a custom `PrivateStateProvider`.

### Step 3: (Optional) Use New Export/Import Features

The new import/export functionality can help mitigate data loss risks:

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const provider = levelPrivateStateProvider({ walletProvider });

// Backup private state regularly
const backup = await provider.exportPrivateStates();
saveToSecureStorage(backup);

// Restore if needed
const backupData = loadFromSecureStorage();
await provider.importPrivateStates(backupData, { onConflict: 'skip' });
```

### Step 4: Contract Address Scoping (Automatic)

Contract address scoping is now automatic. No changes needed to your code:

```typescript
// This works automatically - no changes needed
const deployed = await deployContract(providers, {
  compiledContract: MyContract,
  privateStateId: 'myState',
  initialPrivateState: { counter: 0 }
});

// Private state is automatically scoped to the deployed contract
const result = await deployed.callTx.increment();
```

## Complete Migration Example

### Before (v3.0.0)

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';

const privateStateProvider = levelPrivateStateProvider({
  walletProvider: myWalletProvider
});

const deployed = await deployContract(providers, {
  compiledContract: MyContract,
  privateStateId: 'myState',
  initialPrivateState: { counter: 0 }
});

const result = await deployed.callTx.increment();
```

### After (v3.1.0)

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';

const privateStateProvider = levelPrivateStateProvider({
  walletProvider: myWalletProvider
});

// NEW: Regularly backup private state to mitigate data loss risks
const backup = await privateStateProvider.exportPrivateStates();
saveToSecureStorage(backup);

const deployed = await deployContract(providers, {
  compiledContract: MyContract,
  privateStateId: 'myState',
  initialPrivateState: { counter: 0 }
});

// Contract address scoping is now automatic
const result = await deployed.callTx.increment();
```

## Planning for Production

If you are planning to move to production, you should implement a custom `PrivateStateProvider`:

```typescript
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

class ProductionPrivateStateProvider implements PrivateStateProvider {
  constructor(private database: Database) {}

  async get<T>(key: string): Promise<T | undefined> {
    // Implement with proper database storage
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Implement with proper database storage
  }

  async delete(key: string): Promise<void> {
    // Implement with proper database storage
  }

  async clear(): Promise<void> {
    // Implement with proper database storage
  }

  setContractAddress(address: ContractAddress): void {
    // Implement contract scoping
  }

  async exportPrivateStates(options?: ExportOptions): Promise<EncryptedExport> {
    // Implement export functionality
  }

  async importPrivateStates(data: EncryptedExport, options?: ImportOptions): Promise<ImportResult> {
    // Implement import functionality
  }
}
```

## Common Issues and Solutions

### Issue 1: Deprecation Warning

**Warning:**
```
npm WARN deprecated @midnight-ntwrk/midnight-js-level-private-state-provider
```

**Solution:** This is expected. The package is marked as not for commercial use. For development/testing, you can continue using it.

### Issue 2: Export Password Too Short

**Error:**
```
Password must be at least 16 characters
```

**Solution:**
```typescript
const backup = await provider.exportPrivateStates({
  password: 'my-secure-password-16-chars-min'
});
```

### Issue 3: Import Conflict Error

**Error:**
```
ImportConflictError: State already exists
```

**Solution:**
```typescript
await provider.importPrivateStates(backupData, {
  onConflict: 'skip'      // Keep existing, skip conflicts
  // or
  onConflict: 'overwrite' // Replace existing with imported
});
```

## Testing After Migration

```typescript
import { describe, test, expect } from 'vitest';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

describe('Private State Provider', () => {
  test('export and import private states', async () => {
    const provider = levelPrivateStateProvider({ walletProvider });

    // Set some state
    provider.setContractAddress(contractAddress);
    await provider.set('testKey', { value: 42 });

    // Export
    const backup = await provider.exportPrivateStates();
    expect(backup.format).toBe('midnight-private-state-export');

    // Import to another provider
    const provider2 = levelPrivateStateProvider({ walletProvider });
    const result = await provider2.importPrivateStates(backup, {
      onConflict: 'overwrite'
    });

    expect(result.imported).toBeGreaterThan(0);
  });
});
```

# Breaking Changes v3.2.0

## 1. LevelPrivateStateProvider: `walletProvider` Option Removed (#528)

### Reason
Simplified configuration by consolidating authentication to a single method. Using `privateStoragePasswordProvider` provides clearer separation of concerns and more predictable encryption behavior.

### Impact
All `levelPrivateStateProvider` instantiations using `walletProvider` must be migrated to use `privateStoragePasswordProvider`.

### Before
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = levelPrivateStateProvider({
  walletProvider: myWalletProvider
});
```

### After
```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/level-private-state-provider';

const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => process.env.STORAGE_PASSWORD!,
  accountId: walletAddress
});
```

### Migration Steps
1. Remove `walletProvider` from configuration
2. Add `privateStoragePasswordProvider` function that returns the encryption password
3. Add `accountId` (typically the wallet address) for account isolation
4. Ensure password meets requirements (16+ chars, 3+ character types)

---

## 2. LevelPrivateStateProvider: `accountId` Now Required (#545)

### Reason
Account-scoped isolation ensures data separation between different wallet accounts. This prevents data leakage and provides a clear namespace for each user's private states and signing keys.

### Impact
The `accountId` configuration option is now mandatory. Storage paths are namespaced using a SHA-256 hash of the account ID.

### Before
```typescript
const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => 'password'
  // accountId was optional
});
```

### After
```typescript
const provider = levelPrivateStateProvider({
  privateStoragePasswordProvider: () => 'password',
  accountId: walletAddress // Required
});
```

### Migration Steps
1. Add `accountId` to all `levelPrivateStateProvider` configurations
2. Use a stable identifier (wallet address recommended)
3. For existing data, use `migrateToAccountScoped()` to transition:

```typescript
import { migrateToAccountScoped } from '@midnight-ntwrk/level-private-state-provider';

const result = await migrateToAccountScoped({ accountId: walletAddress });
console.log(`Migrated ${result.privateStatesMigrated} private states`);
console.log(`Migrated ${result.signingKeysMigrated} signing keys`);
```

### Storage Structure Change

**Before (v3.1.0):**
```
LevelDB (midnight-level-db)
├── private-states
│   └── {contractAddress}:{privateStateId}
└── signing-keys
    └── {contractAddress}
```

**After (v3.2.0):**
```
LevelDB (midnight-level-db)
├── private-states:{hashedAccountId}
│   ├── __midnight_encryption_metadata__
│   └── {contractAddress}:{privateStateId}
└── signing-keys:{hashedAccountId}
    ├── __midnight_encryption_metadata__
    └── {contractAddress}
```

---

## 3. Auth Token Removed from Compact Fetch (#523)

### Reason
Authentication is no longer required for fetching compiled contracts, simplifying the integration process.

### Impact
The `authToken` parameter has been removed from compact fetch operations. Any code passing auth tokens will need to be updated.

### Before
```typescript
// v3.1.0 - auth token was supported
const compiled = await fetchCompact({
  uri: 'https://...',
  authToken: 'my-token' // This option existed
});
```

### After
```typescript
// v3.2.0 - auth token removed
const compiled = await fetchCompact({
  uri: 'https://...'
  // authToken no longer supported
});
```

### Migration Steps
1. Remove `authToken` from any `fetchCompact` calls
2. If authentication is still required by your infrastructure, handle it at the network/proxy level

---

## Common Migration Issues

### Issue: Password Requirements Not Met
**Error:** `Password does not meet security requirements`
**Solution:** Ensure password has:
- Minimum 16 characters
- At least 3 character types (uppercase, lowercase, digits, special)
- No more than 3 consecutive identical characters
- No sequential patterns (e.g., `1234`, `abcd`)

### Issue: Account ID Not Provided
**Error:** `accountId is required for LevelPrivateStateProvider`
**Solution:** Add `accountId` to configuration, typically using the wallet address.

### Issue: Existing Data Not Accessible
**Solution:** Run `migrateToAccountScoped()` to move data to account-scoped storage:
```typescript
const result = await migrateToAccountScoped({ accountId: walletAddress });
```

### Issue: V1 Encrypted Data After Upgrade
**Solution:** V1 data is automatically migrated to V2 on read. For explicit migration, use password rotation:
```typescript
await provider.changePassword(
  () => 'current-password',
  () => 'same-or-new-password'
);
```

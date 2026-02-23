# ⚠️ WARNING

> RISK: This provider lacks a recovery mechanism. 
> Clearing browser cache or deleting local files permanently destroys the private state (contract state/keys). 
> For assets with real-world value, this may result in irreversible financial loss. 
> DO NOT use for production applications requiring data persistence.
---

# What is this?
An example implementation of a private state provider that works with LevelDB compatible data stores.

This package provides **encrypted storage** for private states and signing keys using AES-256-GCM encryption.

This package was created for the [Midnight network](https://midnight.network).

Please visit the [Midnight Developer Hub](https://midnight.network/developer-hub) to learn more.

## Security

### Encryption at Rest

**All data is encrypted by default** using AES-256-GCM with PBKDF2 key derivation.

### Security Features

- **AES-256-GCM**: Industry-standard authenticated encryption
- **PBKDF2**: 600,000 iterations with random salt per database
- **Mandatory Password**: By default data is encrypted with wallets encryption key, developer can override this behavior 
- **Password Validation**: Minimum 16 character length enforced
- **Automatic Migration**: Existing unencrypted data is automatically encrypted on first access

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
  privateStoragePasswordProvider: () => currentPassword
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
- Both passwords must meet the minimum requirements (16+ characters, 3+ character classes)
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
  privateStoragePasswordProvider: () => password
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

### Error Handling

If the password is too short (< 16 characters):
```
Error: Password must be at least 16 characters long.
Use a strong, randomly generated password for production.
```

# Agree to Terms
By downloading and using this image, you agree to [Midnight's Terms and Conditions](https://midnight.network/static/terms.pdf), which includes the [Privacy Policy](https://midnight.network/static/privacy-policy.pdf).

# License
The software provided herein is licensed under the [Apache License V2.0](http://www.apache.org/licenses/LICENSE-2.0).

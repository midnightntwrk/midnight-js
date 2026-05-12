# Migration Guide v4.0.4 to v4.1.0

## Overview

This guide covers migrating from midnight-js v4.0.4 to v4.1.0. The two main breaking changes are the async StorageEncryption API and the protocol import ACL. Most consumers of the high-level `levelPrivateStateProvider` function will only need to update protocol imports.

## Step 1: Update Dependencies

```bash
yarn add @midnight-ntwrk/midnight-js-protocol@^4.1.0
yarn add @midnight-ntwrk/midnight-js-level-private-state-provider@^4.1.0
# Update all other @midnight-ntwrk packages to ^4.1.0
```

Remove direct protocol dependencies from your `package.json`:

```bash
yarn remove @midnight-ntwrk/ledger-v8 @midnight-ntwrk/compact-runtime @midnight-ntwrk/compact-js @midnight-ntwrk/onchain-runtime-v3 @midnight-ntwrk/platform-js
```

## Step 2: Migrate Protocol Imports

Replace all direct protocol imports with ACL subpath imports.

### 2.1 Ledger

**Before (v4.0.4):**
```typescript
import { type Transaction, type UnbalancedTransaction } from '@midnight-ntwrk/ledger-v8';
```

**After (v4.1.0):**
```typescript
import { type Transaction, type UnbalancedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
```

### 2.2 Compact Runtime

**Before (v4.0.4):**
```typescript
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
```

**After (v4.1.0):**
```typescript
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
```

### 2.3 Compact JS

**Before (v4.0.4):**
```typescript
import { Contract } from '@midnight-ntwrk/compact-js';
import { createEffectContract } from '@midnight-ntwrk/compact-js/effect-contract';
```

**After (v4.1.0):**
```typescript
import { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { createEffectContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect-contract';
```

### 2.4 Onchain Runtime

**Before (v4.0.4):**
```typescript
import { type Resource } from '@midnight-ntwrk/onchain-runtime-v3';
```

**After (v4.1.0):**
```typescript
import { type Resource } from '@midnight-ntwrk/midnight-js-protocol/onchain-runtime';
```

### 2.5 Platform JS

**Before (v4.0.4):**
```typescript
import { type NetworkId } from '@midnight-ntwrk/platform-js';
```

**After (v4.1.0):**
```typescript
import { type NetworkId } from '@midnight-ntwrk/midnight-js-protocol/platform-js';
```

### 2.6 Verify with ESLint

Run `yarn lint` -- the new ESLint rule will flag any remaining direct protocol imports with specific instructions.

## Step 3: Migrate StorageEncryption (if used directly)

If you use `StorageEncryption` directly (most consumers use `levelPrivateStateProvider` which handles this internally):

### 3.1 Replace Constructor

**Before (v4.0.4):**
```typescript
const encryption = new StorageEncryption(password);
const encryption2 = new StorageEncryption(password, { existingSalt: salt });
```

**After (v4.1.0):**
```typescript
const encryption = await StorageEncryption.create(password);
const encryption2 = await StorageEncryption.create(password, { existingSalt: salt });
```

### 3.2 Add Await to Methods

**Before (v4.0.4):**
```typescript
const encrypted = encryption.encrypt(data);
const decrypted = encryption.decrypt(encrypted);
const valid = encryption.verifyPassword(password);
```

**After (v4.1.0):**
```typescript
const encrypted = await encryption.encrypt(data);
const decrypted = await encryption.decrypt(encrypted);
const valid = await encryption.verifyPassword(password);
```

### 3.3 Update Error Handling in Tests

**Before (v4.0.4):**
```typescript
expect(() => encryption.decrypt(tampered)).toThrow();
```

**After (v4.1.0):**
```typescript
await expect(encryption.decrypt(tampered)).rejects.toThrow();
```

## Step 4: Optional -- Configure CryptoBackend

If targeting React Native or environments without `crypto.subtle`:

```typescript
const provider = await levelPrivateStateProvider({
  ...config,
  cryptoBackend: 'noble',           // pure-JS crypto (no Web Crypto required)
  levelFactory: myCustomLevel,       // custom AbstractLevel implementation
});
```

## Step 5: Verify

```bash
yarn lint       # Check protocol imports and code style
yarn build      # TypeScript compilation
yarn test       # Unit tests
```

## Troubleshooting

### Error: "StorageEncryption is not a constructor"

The constructor is now private. Use `await StorageEncryption.create(password)` instead.

### Error: "Cannot find module '@midnight-ntwrk/ledger-v8'"

Add `@midnight-ntwrk/midnight-js-protocol` and change the import to `@midnight-ntwrk/midnight-js-protocol/ledger`.

### Error: "Web Crypto API is not available"

You are running in a non-secure context (not HTTPS or localhost). Either:
- Use `cryptoBackend: 'noble'` in your provider config
- Serve your app over HTTPS

### Apollo Client type errors

`@apollo/client` was upgraded from 3.x to 4.x. If you interact with Apollo types directly, consult the [Apollo Client 4 migration guide](https://www.apollographql.com/docs/react/migrating/apollo-client-3-to-4).

## Rollback Plan

If rollback is needed:
1. Revert `@midnight-ntwrk/*` packages to `^4.0.4`
2. Restore direct protocol package dependencies
3. Revert protocol imports to direct package names
4. Revert `StorageEncryption.create()` to `new StorageEncryption()`
5. Remove `await` from sync encryption methods

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
import { createContract } from '@midnight-ntwrk/compact-js/effect/Contract';
```

**After (v4.1.0):**
```typescript
import { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { createContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
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
const encryption2 = new StorageEncryption(password, salt); // positional Buffer
```

**After (v4.1.0):**
```typescript
const encryption = await StorageEncryption.create(password);
const encryption2 = await StorageEncryption.create(password, { existingSalt: salt }); // options object
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

## Step 5: Audit Behaviour Changes

Three non-breaking-API-but-observable behaviour changes ship in v4.1.0. Review your code if any apply.

### 5.1 `verifyPassword` is now ~hundreds of ms (#883)

`StorageEncryption.verifyPassword` previously compared a single-round SHA-256 of the password in microseconds. It now runs full PBKDF2 with `PBKDF2_ITERATIONS_V2` (600K iterations) and constant-time-compares the derived key against the in-memory `encryptionKey`. Wall-clock cost is hardware-dependent — expect roughly 200–400ms on commodity x86, ~100–200ms on Apple Silicon, and potentially >1s on the Noble pure-JS backend.

**Impact for consumers of `levelPrivateStateProvider`:** the provider verifies the password on cold reads after a cache miss (e.g., the first state read of a session, or the first read after `invalidateEncryptionCache`). Subsequent reads from the same session hit the cached `encryptionKey` and do not re-run PBKDF2. If your dApp eagerly invalidates the cache or opens new sessions in a tight loop, restructure to verify once per session.

Legacy V1 ciphertext (`PBKDF2_ITERATIONS_V1` = 100K iterations) continues to decrypt via `decryptWithPassword`; new writes use V2. **On-disk format is unchanged — no data migration is required.**

### 5.2 `assertDefined` / `assertUndefined` falsy-value fix (#900)

If your code relied on the buggy truthiness behaviour, switch to an explicit predicate:

**Before (relied on bug):**
```typescript
// Was incorrectly rejecting 0
assertDefined(value);
if (value !== 0) {
  // ...
}
```

**After (v4.1.0):**
```typescript
// 0 is now correctly treated as defined — assert explicitly
assertDefined(value);
if (value > 0) {
  // ...
}
```

### 5.3 `decryptValue` fails closed (#885)

`decryptValue` in `level-private-state-provider` now throws on unrecognized data instead of returning raw bytes. This only affects `rotateStorePassword`. If you wrap rotation, expect a distinct error during rotation if the LevelDB store contains plaintext entries that the password-rotation path encounters; both call sites already wrap with `{ cause }`.

Read paths (`getState`, `getAllEntries`) are unchanged and continue to transparently migrate legacy plaintext.

## Step 6: Audit Bug Fixes That May Affect You

### 6.1 Shielded coin segment routing (#876, #877)

If you build dApps that emit user-bound shielded coins from fallible-segment circuit operations (e.g., LP-token mints, conditional outputs), the wallet balancer no longer reports `InsufficientFunds` for the freshly-minted token color. **No action required** — this is a transparent fix to `createUnprovenLedgerCallTx`.

If you depended on the buggy guaranteed-bucket fallback, your transactions will now route correctly. Cross-segment ambiguity throws explicitly — if your transcript leaves a commitment / nullifier in both halves, you will see an error rather than silent guaranteed routing.

### 6.2 Browser-bundleable contracts (#869)

`@midnight-ntwrk/midnight-js-contracts` no longer imports `node:fs` or `node:path`. If you were bundling for the browser with a polyfill stub for these modules, you can drop the stubs.

## Step 7: Verify

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

### Error: "Unsafe name" or "Invalid semver" from a ZK provider or VersionManager (#875)

`circuitId` is now validated by `assertSafeName` in both `node-zk-config-provider` and `fetch-zk-config-provider`. Compactc versions are validated by `assertSemVer` in `VersionManager`. If you pass user-controlled values, route them through these validators before the provider call so you can surface a friendly error to the user.

## Rollback Plan

If rollback is needed:
1. Revert `@midnight-ntwrk/*` packages to `^4.0.4`
2. Restore direct protocol package dependencies
3. Revert protocol imports to direct package names
4. Revert `StorageEncryption.create()` to `new StorageEncryption()`
5. Remove `await` from sync encryption methods

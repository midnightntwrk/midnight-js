# Breaking Changes v4.1.0

## 1. StorageEncryption migrated to async Web Crypto API (#798)

### Reason

The Node.js `crypto` module is not available in browser contexts. Migrating to the Web Crypto API (`globalThis.crypto.subtle`) enables `level-private-state-provider` to work in browsers and other non-Node.js environments. The Web Crypto API is inherently asynchronous, requiring the API surface to change from synchronous to async.

### Impact

Any code that:
- Creates `StorageEncryption` instances via `new StorageEncryption()`
- Calls `encrypt()`, `decrypt()`, `decryptWithPassword()`, or `verifyPassword()` synchronously
- Calls `invalidateEncryptionCache()` without `await`

### Before

```typescript
import { StorageEncryption } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const encryption = new StorageEncryption(password);
const encrypted = encryption.encrypt(data);
const decrypted = encryption.decrypt(encrypted);
const isValid = encryption.verifyPassword(password);
```

### After

```typescript
import { StorageEncryption } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const encryption = await StorageEncryption.create(password);
const encrypted = await encryption.encrypt(data);
const decrypted = await encryption.decrypt(encrypted);
const isValid = await encryption.verifyPassword(password);
```

### Migration Steps

1. Replace all `new StorageEncryption(password)` with `await StorageEncryption.create(password)`
2. Replace all `new StorageEncryption(password, { existingSalt })` with `await StorageEncryption.create(password, { existingSalt })`
3. Add `await` before every `encrypt()`, `decrypt()`, `decryptWithPassword()`, and `verifyPassword()` call
4. Add `await` before `invalidateEncryptionCache()` calls (return type changed from `void` to `Promise<void>`)
5. Convert synchronous `.toThrow()` test assertions to `await .rejects.toThrow()`

---

## 2. Protocol imports via ACL package (#832)

### Reason

Protocol packages use version-specific names (e.g., `@midnight-ntwrk/ledger-v8`, `@midnight-ntwrk/onchain-runtime-v3`). When protocol versions are upgraded, every import across every package must be updated. The ACL package provides version-agnostic subpath exports so that future protocol upgrades only require updating the single protocol package.

### Impact

Any code that imports directly from:
- `@midnight-ntwrk/ledger-v8`
- `@midnight-ntwrk/compact-runtime`
- `@midnight-ntwrk/compact-js` or `@midnight-ntwrk/compact-js/*`
- `@midnight-ntwrk/onchain-runtime-v3`
- `@midnight-ntwrk/platform-js` or `@midnight-ntwrk/platform-js/*`

An ESLint rule is added that blocks direct imports from these packages.

### Before

```typescript
import { type Transaction, type UnbalancedTransaction } from '@midnight-ntwrk/ledger-v8';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { Contract } from '@midnight-ntwrk/compact-js';
import { createEffectContract } from '@midnight-ntwrk/compact-js/effect-contract';
import { type Resource } from '@midnight-ntwrk/onchain-runtime-v3';
import { type NetworkId } from '@midnight-ntwrk/platform-js';
```

### After

```typescript
import { type Transaction, type UnbalancedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { createEffectContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect-contract';
import { type Resource } from '@midnight-ntwrk/midnight-js-protocol/onchain-runtime';
import { type NetworkId } from '@midnight-ntwrk/midnight-js-protocol/platform-js';
```

### Migration Steps

1. Add `@midnight-ntwrk/midnight-js-protocol` as a dependency
2. Replace all direct protocol imports using the mapping table:

| Direct import | ACL subpath |
|---|---|
| `@midnight-ntwrk/ledger-v8` | `@midnight-ntwrk/midnight-js-protocol/ledger` |
| `@midnight-ntwrk/compact-runtime` | `@midnight-ntwrk/midnight-js-protocol/compact-runtime` |
| `@midnight-ntwrk/compact-js` | `@midnight-ntwrk/midnight-js-protocol/compact-js` |
| `@midnight-ntwrk/compact-js/effect` | `@midnight-ntwrk/midnight-js-protocol/compact-js/effect` |
| `@midnight-ntwrk/compact-js/effect-contract` | `@midnight-ntwrk/midnight-js-protocol/compact-js/effect-contract` |
| `@midnight-ntwrk/onchain-runtime-v3` | `@midnight-ntwrk/midnight-js-protocol/onchain-runtime` |
| `@midnight-ntwrk/platform-js` | `@midnight-ntwrk/midnight-js-protocol/platform-js` |
| `@midnight-ntwrk/platform-js/effect-configuration` | `@midnight-ntwrk/midnight-js-protocol/platform-js/effect-configuration` |
| `@midnight-ntwrk/platform-js/effect-contract-address` | `@midnight-ntwrk/midnight-js-protocol/platform-js/effect-contract-address` |

3. Remove direct protocol package dependencies from your `package.json`
4. Run `yarn lint` to verify no direct imports remain

---

## Common Migration Issues

### Error: "StorageEncryption is not a constructor"

**Solution:** Replace `new StorageEncryption(password)` with `await StorageEncryption.create(password)`. The constructor is no longer public.

### Error: "Cannot find module '@midnight-ntwrk/ledger-v8'"

**Solution:** Add `@midnight-ntwrk/midnight-js-protocol` as a dependency and change the import to `@midnight-ntwrk/midnight-js-protocol/ledger`.

### ESLint error: "Import from @midnight-ntwrk/midnight-js-protocol/ledger instead"

**Solution:** Follow the import mapping table above to replace direct protocol imports with ACL subpath imports.

### Error: "encryption.encrypt is not a function" / "encrypt(...).then is not a function"

**Solution:** `encrypt()`, `decrypt()`, etc. are now async. Add `await` before each call and ensure the containing function is `async`.

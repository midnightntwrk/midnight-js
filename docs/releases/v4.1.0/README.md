# midnight-js v4.1.0 Release Documentation

**Release Date:** April 22, 2026
**Previous Version:** v4.0.4
**Migration Complexity:** Medium (breaking changes in storage encryption API and protocol imports)

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [Breaking Changes](./breaking-changes.md) - StorageEncryption async migration, protocol import paths
- [New Features](./new-features.md) - Web Crypto, CryptoBackend abstraction, Protocol ACL, React Native support
- [Migration Guide](./migration-guide.md) - Step-by-step upgrade from v4.0.4
- [API Changes](./api-changes.md) - Complete API reference changes

## Breaking Changes (2)

1. **StorageEncryption migrated to async Web Crypto API** - Constructor replaced with async factory `StorageEncryption.create()`, all encrypt/decrypt methods now async (#798)
2. **Protocol imports via ACL package** - Direct imports from `@midnight-ntwrk/ledger-v8`, `@midnight-ntwrk/compact-runtime`, etc. replaced with `@midnight-ntwrk/midnight-js-protocol` subpaths (#832)

## New Features (4)

1. Web Crypto API for storage encryption -- browser compatibility (#798)
2. CryptoBackend abstraction with Noble fallback -- React Native and non-secure contexts (#827)
3. Protocol ACL package -- version-agnostic protocol imports (#832)
4. DAppConnectorWalletAdapter for testkit-js -- wallet-delegated proving in e2e tests (#855)

## Quick Migration

### StorageEncryption (v4.0.4 -> v4.1.0)

```typescript
// Before (v4.0.4)
const encryption = new StorageEncryption(password);
const encrypted = encryption.encrypt(data);

// After (v4.1.0)
const encryption = await StorageEncryption.create(password);
const encrypted = await encryption.encrypt(data);
```

### Protocol Imports (v4.0.4 -> v4.1.0)

```typescript
// Before (v4.0.4)
import { type Transaction } from '@midnight-ntwrk/ledger-v8';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';

// After (v4.1.0)
import { type Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
```

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.0+

## Testing Checklist

- [ ] `StorageEncryption.create()` replaces all `new StorageEncryption()` usages
- [ ] All encrypt/decrypt calls use `await`
- [ ] Protocol imports use `@midnight-ntwrk/midnight-js-protocol/*` subpaths
- [ ] ESLint passes (new rule blocks direct protocol imports)
- [ ] `@apollo/client` v4 compatible -- no breaking type errors
- [ ] TypeScript compilation passes
- [ ] Unit tests pass
- [ ] Integration tests pass

---

**Last Updated:** April 22, 2026
**License:** Apache-2.0

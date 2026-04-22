# Release Notes v4.1.0

**Release Date:** April 22, 2026
**Previous Version:** v4.0.4
**Node.js Requirement:** >=22

## Breaking Changes

### 1. StorageEncryption migrated to async Web Crypto API (#798)

`StorageEncryption` in `level-private-state-provider` has been migrated from Node.js `crypto` module to the Web Crypto API (`globalThis.crypto.subtle`). This enables browser compatibility but changes the API surface:

- **Constructor** replaced with async factory: `new StorageEncryption(password)` -> `await StorageEncryption.create(password)`
- **encrypt/decrypt/verifyPassword/decryptWithPassword** are now async (return `Promise`)
- **invalidateEncryptionCache** return type changed from `void` to `Promise<void>`
- `isDecryptionError` updated to recognize Web Crypto `DOMException` error messages

Salt comparison now uses `timingSafeEqual` for constant-time comparison.

### 2. Protocol imports via ACL package (#832)

New `@midnight-ntwrk/midnight-js-protocol` package wraps all 5 external protocol packages behind version-agnostic subpath exports. Direct imports from protocol packages are now blocked by an ESLint rule.

| Before (v4.0.4) | After (v4.1.0) |
|---|---|
| `@midnight-ntwrk/ledger-v8` | `@midnight-ntwrk/midnight-js-protocol/ledger` |
| `@midnight-ntwrk/compact-runtime` | `@midnight-ntwrk/midnight-js-protocol/compact-runtime` |
| `@midnight-ntwrk/compact-js` | `@midnight-ntwrk/midnight-js-protocol/compact-js` |
| `@midnight-ntwrk/onchain-runtime-v3` | `@midnight-ntwrk/midnight-js-protocol/onchain-runtime` |
| `@midnight-ntwrk/platform-js` | `@midnight-ntwrk/midnight-js-protocol/platform-js` |

Additional subpaths: `./compact-js/effect`, `./compact-js/effect-contract`, `./platform-js/effect-configuration`, `./platform-js/effect-contract-address`.

## Security

### Update axios (#834)

Security update to axios in testkit-js packages, addressing known vulnerabilities.

### Fix critical protobufjs vulnerability (#854)

Bumps `protobufjs` from 7.5.4 to 7.5.5, fixing CVE-2026-41242 (arbitrary code execution via `__proto__` poisoning in Message constructor and invalid characters in type names).

## Features

### CryptoBackend abstraction with Noble fallback (#827)

Introduces a pluggable `CryptoBackend` interface for `level-private-state-provider` with two implementations:

- **WebCryptoCryptoBackend** -- uses `globalThis.crypto.subtle` (default when available)
- **NobleCryptoBackend** -- pure-JS fallback using `@noble/ciphers` and `@noble/hashes`

The backend is auto-resolved: WebCrypto is preferred when available, Noble is used as fallback (e.g., React Native without secure context).

```typescript
const provider = await levelPrivateStateProvider({
  // ...
  cryptoBackend: 'noble', // explicit selection: 'webcrypto' | 'noble' | undefined (auto)
});
```

New exports from `@midnight-ntwrk/midnight-js-level-private-state-provider`:
- `CryptoBackend` (interface)
- `CryptoBackendType` (`'webcrypto' | 'noble'`)
- `StorageEncryptionOptions`

### Injectable levelFactory for React Native support (#827)

`LevelPrivateStateProviderConfig` now accepts an optional `levelFactory` function, enabling any `AbstractLevel`-compatible storage backend to be used instead of the default Node.js `Level`. This unblocks React Native consumers — for example, using [`react-native-leveldb-level-adapter`](https://www.npmjs.com/package/react-native-leveldb-level-adapter) which provides an `AbstractLevel` adapter over native LevelDB bindings via JSI.

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { SKReactNativeLevel } from 'react-native-leveldb-level-adapter';

const provider = await levelPrivateStateProvider({
  // ...
  cryptoBackend: 'noble',
  levelFactory: (dbName) => new SKReactNativeLevel(dbName),
});
```

New exports: `LevelFactory`, `DatabaseLevel`.

### Protocol ACL package (#832)

New `@midnight-ntwrk/midnight-js-protocol` package provides version-agnostic access to 5 protocol packages via subpath exports. Decouples consumer code from protocol version numbers -- future ledger/runtime upgrades only require updating the protocol package.

### DAppConnectorWalletAdapter for testkit-js (#855)

New testing infrastructure for wallet-delegated proving through `dapp-connector-proof-provider`:

- **DAppConnectorWalletAdapter** -- wraps `MidnightWalletProvider` behind the `ConnectedAPI` interface with local WASM proving
- **DAppConnectorInitialAPI** -- provides `InitialAPI` with networkId validation

Enables e2e testing of the dapp-connector proving flow without a standalone proof server.

## Bug Fixes

### Reject HTML responses in FetchZkConfigProvider (#785)

SPA servers return `index.html` with HTTP 200 for non-existent artifact paths. Without Content-Type validation, HTML bytes were silently accepted as ZK key material, causing cryptic proof server failures. The fix validates the Content-Type header and rejects `text/html` responses with a descriptive error including the full URL and status code.

## Dependencies

### Runtime Dependencies Updated
- `@apollo/client`: 3.14.0 -> 4.1.6 (#666)
- `graphql`: 16.13.1 -> 16.13.2 (#778)
- `graphql-ws`: 6.0.7 -> 6.0.8 (#796)
- `@noble/ciphers` and `@noble/hashes`: added (#827)

### Development Dependencies Updated
- `turbo`: 2.8.21 -> 2.9.5 (#845)
- `rollup`: 4.59.0 -> 4.60.1 (#797)
- `typescript`, `ws`, `@vitest/runner`: bumped (#776)
- `docker/login-action`: 4.0.0 -> 4.1.0 (#836)
- `mikepenz/action-junit-report`: 6.3.1 -> 6.4.0 (#792)
- `ctrf-io/github-test-reporter`: 1.0.27 -> 1.0.28 (#793)
- `npm_and_yarn` group: 2 updates (#791)

### Maintenance
- Add protocol as dependency of barrel package (#842)
- Remove unused deps from midnight-js (#800)

## Tests

- Improve indexer-public-data-provider coverage (#801)
- Cover encryption key resolver and dapp-connector error paths (#848)
- Add shell-injection regression suite for compact CLI
- Guard invalidate-and-re-derive in level-private-state
- Add ACL structural and ESLint rule tests
- Prune low-value tests from resolver and dapp-connector suites

## Documentation

- Rewrite CLAUDE.md as contributor guide (#747)
- Add protocol package README and update main README (#835)
- API documentation updates (#846, #841, #833, #826, #784)

## Links

- [Breaking Changes Details](./breaking-changes.md)
- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)
- [v4.0.4 Release Notes](../v4.0.4/release-notes.md)

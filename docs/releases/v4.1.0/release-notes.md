# Release Notes v4.1.0

**Release Date:** May 19, 2026
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

Additional subpaths: `./compact-js/effect`, `./compact-js/effect/Contract`, `./platform-js/effect/Configuration`, `./platform-js/effect/ContractAddress`.

## Security

### Replace SHA-256 password verifier with PBKDF2 (#883)

`StorageEncryption` previously stored a single-round SHA-256 hash of the user's password in memory for cache-hit verification. An attacker who dumped process memory could brute-force the plaintext password offline at hardware speed, bypassing the 600K-iteration PBKDF2 protection used for the encryption key.

The fast hash is removed entirely. `verifyPassword` now runs PBKDF2 with `PBKDF2_ITERATIONS_V2` (600K iterations) and constant-time-compares the derived key against the in-memory `encryptionKey`. On-disk format is unchanged — no data migration is required. Legacy V1 ciphertext continues to decrypt at 100K iterations through `decryptWithPassword`; new writes use V2.

**Performance trade-off:** `verifyPassword` now takes hundreds of milliseconds (PBKDF2 cost — hardware-dependent, roughly 200–400ms on commodity x86; longer on the Noble pure-JS backend) instead of microseconds. Inside `levelPrivateStateProvider` this cost is paid on cold reads after a cache miss (e.g., first state read of a session, or after `invalidateEncryptionCache`) — subsequent reads in the same session hit the cached `encryptionKey` and do not re-run PBKDF2. This is the accepted security trade-off per audit.

### Block path traversal in ZK providers and VersionManager (#875)

Hardens filesystem and URL inputs against `../` traversal payloads. New pure-string validators are added to `@midnight-ntwrk/midnight-js-utils`:

- `assertSafeName(name, label)` — rejects empty / over-long / traversal-bearing names
- `assertSemVer(version, label)` — rejects non-semver strings

Applied at three choke points:

- `node-zk-config-provider` — validates `circuitId` before any `path.resolve`
- `fetch-zk-config-provider` — validates `circuitId` and uses `encodeURIComponent` + `new URL()` for safe URL construction
- `compact/version-manager` — `getVersionDir` is now the single validator for `versionExists`, `getCompactcPath`, and `removeVersion`, with a containment check before `rmSync` as defence in depth

### Fail closed on unrecognized data in `decryptValue` (#885)

`decryptValue` in `level-private-state-provider` previously logged a debug message and returned raw bytes when `StorageEncryption.isEncrypted()` returned false. This fail-open behaviour could mask storage corruption or plaintext injection into the LevelDB store during password rotation.

`decryptValue` now throws on unrecognized data. The two call sites both live inside `rotateStorePassword` and already wrap errors with `{ cause }`, so the new error surfaces as a distinct failure during rotation. Read paths (`getState`, `getAllEntries`) do not call `decryptValue` — they check `StorageEncryption.isEncrypted()` directly and re-encrypt legacy plaintext in place, so transparent migration is preserved.

The always-false `catch` in `isEncrypted` is also removed (it only hid programmer errors — `Buffer.from` on string input cannot throw).

### Update axios (#834)

Security update to axios in testkit-js packages, addressing known vulnerabilities.

### Dependabot security bumps (#854)

Bumps `protobufjs` from 7.5.4 to 7.5.5 and `follow-redirects` from 1.15.11 to 1.16.0 via a grouped Dependabot update. See each package's upstream changelog for the underlying advisories.

## Features

### CryptoBackend abstraction with Noble fallback (#827)

Introduces a pluggable `CryptoBackend` interface for `level-private-state-provider` with two backends selected via the `cryptoBackend` config string (concrete implementation classes are internal — not exported from the package barrel):

- **`'webcrypto'`** -- uses `globalThis.crypto.subtle` (default when available)
- **`'noble'`** -- pure-JS fallback using `@noble/ciphers` and `@noble/hashes`

The backend is auto-resolved: WebCrypto is preferred when available, Noble is used as fallback (e.g., React Native without secure context).

```typescript
const provider = await levelPrivateStateProvider({
  // ...
  cryptoBackend: 'noble', // explicit selection: 'webcrypto' | 'noble' | undefined (auto)
});
```

New type exports from `@midnight-ntwrk/midnight-js-level-private-state-provider`:
- `type CryptoBackend` (interface)
- `type CryptoBackendType` (`'webcrypto' | 'noble'`)
- `type StorageEncryptionOptions`

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

### Route shielded coins to the correct segment (#876, #877)

`createUnprovenLedgerCallTx` previously bucketed all shielded outputs and inputs into the guaranteed Zswap offer regardless of which circuit segment produced them. User-bound shielded coins emitted from fallible-segment circuit operations (e.g., LP-token mints) therefore landed in the guaranteed offer, and the wallet balancer reported `InsufficientFunds` for the freshly-minted token color.

The fix introduces `zswapStateToSegmentedOffer` in `packages/contracts/src/utils/zswap-utils.ts`, which builds separate guaranteed and fallible `UnprovenOffer` instances by matching each coin against `partitionedTranscript[i].effects`:

- **Outputs** route by the union of `claimedShieldedReceives` ∪ `claimedShieldedSpends` (matches ledger v8 `construct.rs`)
- **Inputs** route by nullifier match against `claimedNullifiers` (matches ledger v8)
- **Transients** are detected before nullifier routing so transient callers (without chain state) continue to work
- Cross-segment ambiguity now throws explicitly instead of silently falling back to the guaranteed offer

New internal exports from `packages/contracts/src/utils/zswap-utils.ts`: `GUARANTEED_SEGMENT_NUMBER`, `FALLIBLE_SEGMENT_NUMBER`, `zswapStateToSegmentedOffer`. `zswapStateToOffer` is preserved as a thin wrapper for partial-transcript callers.

### Correctly handle falsy values in `assertDefined` and `assertUndefined` (#900)

`assertDefined` and `assertUndefined` in `@midnight-ntwrk/midnight-js-utils` used truthiness checks (`!value` / `value`), so valid falsy values — `0`, `''`, `false`, `0n` — were incorrectly rejected by `assertDefined` and incorrectly accepted by `assertUndefined`. Both helpers now use explicit `=== null || === undefined` checks. Closes #806.

**Behaviour change:** if your code relied on the buggy truthiness behaviour (e.g., `assertDefined(value)` to also reject `0`), it must now use an explicit predicate.

### Remove `fs`/`path` imports from `contracts/submit-tx` for browser compatibility (#869)

`logTransaction()` in `packages/contracts/src/submit-tx.ts` previously imported `node:fs` and `node:path` to write a debug trace file. These Node-only imports prevented `@midnight-ntwrk/midnight-js-contracts` from being bundled for the browser. The fs/path imports and debug file writes are removed; `console` logging is preserved.

### Reject HTML responses in FetchZkConfigProvider (#785)

SPA servers return `index.html` with HTTP 200 for non-existent artifact paths. Without Content-Type validation, HTML bytes were silently accepted as ZK key material, causing cryptic proof server failures. The fix validates the Content-Type header and rejects `text/html` responses with a descriptive error including the full URL and status code.

## Dependencies

### Runtime Dependencies Updated
- `@apollo/client`: 3.14.0 -> 4.1.6 (#666)
- `graphql`: 16.13.1 -> 16.13.2 (#778)
- `graphql-ws`: 6.0.7 -> 6.0.8 (#796)
- `@noble/ciphers` and `@noble/hashes`: added (#827)

### Toolchain
- `compactc`: bumped to 0.31.0; contract test fixtures recompiled (#902)
- `yarn`: 4.12.0 -> 4.14.1 (#878)

### Testkit Dependencies
- `@midnight-ntwrk/wallet-sdk` barrel: migrated to v1.0.0 — testkit-js now uses the new barrel package instead of individual `wallet-sdk-*` subpackages; aligns with ledger 8.0.3 binding marker renames and updated `InMemoryTransactionHistoryStorage` constructor. Two granular subpath imports remain (`wallet-sdk-prover-client/effect`, `wallet-sdk-shielded/v1`) where the barrel does not re-export. New default configs: `DefaultShieldedConfiguration`, `DefaultUnshieldedConfiguration`, `DefaultDustConfiguration`. (#862)
- Indexer and node container images updated to match the current preview channel (#879)

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
- API documentation updates (#884, #866, #846, #841, #833, #826, #784)

## Links

- [Breaking Changes Details](./breaking-changes.md)
- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)
- [v4.0.4 Release Notes](../v4.0.4/release-notes.md)

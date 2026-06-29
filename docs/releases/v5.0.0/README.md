# midnight-js v5.0.0 Release Documentation

**Release Date:** June 29, 2026
**Previous Version:** v4.1.1
**Node.js Requirement:** >=22
**Migration Complexity:** Significant — protocol upgrade (ledger-v9 / onchain-runtime-v4), a structured `SigningKey` shape change, and a new npm scope (`@midnightntwrk`)

## Quick Links

- [Release Notes](./release-notes.md) — High-level changelog
- [Breaking Changes](./breaking-changes.md) — Protocol swap, `SigningKey` shape, scope change
- [New Features](./new-features.md) — MIP-0002 contract events, disposable indexer provider, classified deserialization errors
- [Migration Guide](./migration-guide.md) — Step-by-step upgrade instructions
- [API Changes](./api-changes.md) — New types, methods, and signature changes

## Why this is a major release

v5.0.0 retargets the framework's on-chain protocol bindings from **ledger-v8 / onchain-runtime-v3** to **ledger-v9 / onchain-runtime-v4**, published under the new **`@midnightntwrk`** npm scope. This is a protocol-level break: state serialized under the old protocol is not interchangeable, and the `SigningKey` representation changes from a plain hex string to a structured `{ tag, value }` object throughout the public API.

On top of the protocol work, v5.0.0 ships the first installment of **MIP-0002 contract events** — the `PublicDataProvider` can now query and stream decoded on-chain contract events.

## Breaking Changes (high level)

1. **Protocol bindings moved to ledger-v9 / onchain-runtime-v4 under the `@midnightntwrk` scope** — `@midnight-ntwrk/midnight-js-protocol/ledger` and `/onchain-runtime` now re-export the v9 / v4 packages (#970).
2. **`SigningKey` is now a structured object** — `{ tag: 'schnorr' | 'ecdsa', value: <hex> }` instead of a plain hex string. Affects `ContractExecutableRuntimeOptions.signingKey`, signing-key import/export validation, and the DApp-connector wallet adapter (#970).
3. **`ContractState` structural version bumped `[v6]` → `[v8]`** — state persisted/serialized under the old protocol is rejected by the version canary (#970).
4. **`@midnightntwrk/wallet-sdk` 2.0.0-canary** (testkit-js) — keystore and signature/verifying-key APIs adopt the structured key/signature types (#970).
5. **`platform-js` 3.0.0** — models the signing key as `{ tag, value }`; threaded through the Configuration layer (#970).

See [breaking-changes.md](./breaking-changes.md) for full rationale and before/after snippets.

## Headline Features

- **MIP-0002 contract events on `PublicDataProvider`** — `queryContractEvents()` (paged point-in-time read), `contractEventsObservable()` (replay-from-cursor then live tail), and the `getAllContractEvents()` async-iterator helper, backed by an 11-variant `ContractEvent` discriminated union (#988).
- **Disposable `IndexerPublicDataProvider`** — the inner factory is now a class with a structured `IndexerProviderConfig` (`{ queryURL, subscriptionURL, ... }`), fail-fast config validation, and an explicit `dispose()` that releases the underlying WebSocket connection (#961).
- **Classified deserialization / versioning errors** — cryptic ledger/runtime deserialization failures are now wrapped in a structured `DeserializationError` with classification (version-mismatch, generic-param-mismatch, format-mismatch) and actionable mitigation hints (#955).

## Pre-release protocol note

The v9 / v4 protocol packages this release targets are themselves release candidates (`@midnightntwrk/ledger-v9@1.0.0-rc.2`, `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.2`), paired with `compact-runtime 0.17.102-dev.82a6b7c83060d9566e57aa496a33ed80289a7257` and `compactc 0.32.102`. The testkit wallet stack is on the `2.0.0-canary` line. Pin transitive copies to a single version to avoid duplicate-major type clashes (the migration guide covers the resolutions).

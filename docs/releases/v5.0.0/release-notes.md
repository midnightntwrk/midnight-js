# Release Notes v5.0.0

**Release Date:** June 29, 2026
**Previous Version:** v4.1.1
**Node.js Requirement:** >=22

v5.0.0 is a major release. It retargets the framework's on-chain protocol bindings to **ledger-v9 / onchain-runtime-v4** (published under the new `@midnightntwrk` npm scope), changes the public `SigningKey` representation from a plain hex string to a structured `{ tag, value }` object, and delivers the first installment of **MIP-0002 contract events** on the `PublicDataProvider`. It also adds a disposable, config-object-driven indexer provider and a classified deserialization-error layer.

## Breaking Changes

### Protocol swap to ledger-v9 / onchain-runtime-v4 under the `@midnightntwrk` scope (#970)

`packages/protocol` now re-exports the new-scope protocol packages:

- `@midnight-ntwrk/ledger-v8@8.1.0` → `@midnightntwrk/ledger-v9@1.0.0-rc.2`
- `@midnight-ntwrk/onchain-runtime-v3@3.0.0` → `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.2`

The subpath re-exports `@midnight-ntwrk/midnight-js-protocol/ledger` and `/onchain-runtime` now resolve to the v9 / v4 packages. The new `@midnightntwrk` scope is registered in `.yarnrc.yml` and both scope variants are flagged by the ESLint `no-restricted-imports` ACL outside `packages/protocol/src/`.

This pulls through a coordinated dependency set: `@midnight-ntwrk/platform-js@3.0.0`, `@midnight-ntwrk/compact-runtime@0.17.102-dev.82a6b7c83060d9566e57aa496a33ed80289a7257`, and `compactc 0.32.102`.

### `SigningKey` is now a structured object (#970)

`SigningKey` changes from a plain hex string to `{ tag: 'schnorr' | 'ecdsa', value: <hex> }`:

- `ContractExecutableRuntimeOptions.signingKey` now takes the structured `SigningKey`; the Configuration layer maps it to the `KEYS_SIGNING` / `KEYS_SIGNINGKIND` config values.
- Signing-key **import validation** (`level-private-state-provider` and the testkit in-memory provider) validates the structured shape — a non-null object with a known `schnorr`/`ecdsa` tag and an even-length hex `value` (min 6 chars) — instead of the old string check.
- The shared predicate `isValidSigningKey` was extracted into `@midnight-ntwrk/midnight-js-utils`; each provider keeps a thin wrapper that throws its own `InvalidExportFormatError`.
- The DApp-connector wallet adapter (testkit) now round-trips structured `Signature` / `SignatureVerifyingKey`, emitting the `.value` (schnorr) on the wire to preserve the previous plain-hex contract.

### `ContractState` structural version bumped `[v6]` → `[v8]` (#970)

ledger-v9 bumps the structural `ContractState` tag. The version-mismatch canary expectations move accordingly. State serialized under the old protocol triggers a version-mismatch error rather than silently deserializing.

### `ZswapChainState.postBlockUpdate` requires `retentionDuration` (#970)

ledger-v9 made `retentionDuration` (seconds of past Merkle roots to retain) a required argument. Calling with the old single-argument form throws `retention_duration is out of range`. A named constant is now threaded through the production call site.

### `@midnightntwrk/wallet-sdk` 2.0.0-canary (testkit-js) (#970)

The testkit wallet stack moved to the 2.0.0 major canary line (`2.0.0-canary.20260623092110-2f10bcf`), with aligned siblings `wallet-sdk-prover-client@2.0.0-canary.20260623092110-2f10bcf` and `wallet-sdk-address-format@4.0.0-canary.20260623092110-2f10bcf`, which adopts the onchain-v4 structured key/signature types. `createKeystore` now takes `{ kind: SignatureKind; secret: Uint8Array }` rather than a raw `Uint8Array`.

## New Features

### MIP-0002 contract events via `PublicDataProvider` (#988)

The `PublicDataProvider` interface gains indexer-sourced contract-event querying and streaming, per the MIP-0002 indexer-events spec (rev 2):

- `queryContractEvents(filter, page?): Promise<ContractEvent[]>` — finite, point-in-time paged read bounded by inclusive `fromBlock` / `toBlock`.
- `contractEventsObservable(filter, opts?: { startAt?: ContractEventCursor }): Observable<ContractEvent>` — replay from a start cursor (then live tail), terminable with `toBlock`.
- `getAllContractEvents(...)` — async-iterator helper that pages through a query for you.
- `ContractEvent` — an 11-variant discriminated union (`ShieldedSpend` / `ShieldedReceive` / `ShieldedMint` / `ShieldedBurn`, `UnshieldedSpend` / `UnshieldedReceive` / `UnshieldedMint` / `UnshieldedBurn` — the `Unshielded*` variants carry `sender` / `recipient` as `ContractEventAddress = { kind, value }` — plus `Paused`, `Unpaused`, `Misc { name, payload }`), alongside `ContractEventQueryFilter`, `ContractEventSubscriptionFilter`, `ContractEventCursor` (`{ fromId: number }` xor `{ fromBlock: number }`), and `ContractEventsPage`.

The mapper fails fast on an unknown `__typename` or a missing required field, and carries a compile-time exhaustiveness guard so a schema change surfaces as a type error rather than silent drift.

> The query / streaming surface covers all 11 event variants. Contract-side **emission** of MIP-0002 events requires `compactc 0.32.102` + `compact-runtime 0.17.x` (delivered in #996); see the project notes for the current emission scope.

### Disposable `IndexerPublicDataProvider` with structured config (#961)

Phase 2 of #808 (closes #820):

- A structured `IndexerProviderConfig` (`{ queryURL, subscriptionURL, webSocket?, pollInterval? }`) with fail-fast `pollInterval` validation (rejects non-integer, `0`, and negative values), plus a `DEFAULT_POLL_INTERVAL` constant (1000ms). (`validateConfig` / `ValidatedConfig` exist internally but are not re-exported from the package barrel.)
- The inner factory becomes a `class IndexerPublicDataProvider implements PublicDataProvider`; the factory is overloaded — the object-config form is preferred, the positional form is retained as `@deprecated`.
- Explicit resource cleanup: the factory returns the concrete `IndexerPublicDataProvider`, whose `dispose()` stops the Apollo client and awaits the underlying `graphql-ws` teardown; concurrent dispose calls share a single in-flight promise. (`dispose()` lives on the concrete class — it is not a member of the shared `PublicDataProvider` interface.)

### Classified deserialization / versioning errors (#955)

A new `deserialization` module in `@midnight-ntwrk/midnight-js-utils` turns cryptic ledger/runtime deserialization failures into structured errors:

- `DeserializationError` with classification (`version-mismatch` / `generic-param-mismatch` / `format-mismatch` / `unknown`), direction inference, per-source mitigation hints, and structural-tag extraction.
- `isDeserializationError` type guard with a cross-realm brand-check fallback (Web Worker boundaries, npm hoist mismatches).
- A 13-pattern classifier table and 6 typed wrappers (`deserializeContractState`, …, `decodeLedgerStateValue`) as the primary API, plus a `withDeserializationContext` HOF escape hatch.

### Contract-event GraphQL schema enhancements (#971, #975)

The generated contract-event GraphQL schema gains transaction references and beta markers, plus enhanced contract-event types and **dust generation** support.

## Bug Fixes

- **testkit-js:** wait on the indexer healthcheck with a 3-minute startup timeout (#980).
- **testkit-js:** stretch the indexer SPO reconnect delay to keep the connection alive (#950).
- **midnight-js:** guard submit-tx debug logging against disk writes.

## Refactoring

- **midnight-js:** wrapper consolidation, assertion hygiene, and a `pollUntilPresent` helper (#962).
- **midnight-js:** split the `indexer-public-data-provider` monolith into 7 layered files (#960).
- **utils:** extract the shared structured signing-key validation into `midnight-js-utils` (#970).
- **testkit-js:** split the CI workflow into build / e2e / prerelease for build-once fan-out (#949).

## Build & CI

- Bump `compactc 0.32.102` / `compact-runtime 0.17.102` and recompile every test contract against the new runtime (#996).
- testkit-js can build `compactc` from the `compact/` submodule (opt-in) (#978).
- Scope e2e artifacts per environment and render CI summaries; default `TESTKIT_DOCKER_ENV` to `devnet` (#948, #970).

## Dependencies

- `chore(deps): migrate wallet-sdk to @midnightntwrk scope and bump to v1.2.0` (#986) (superseded by the `2.0.0-canary` bump in #970).
- `chore(deps): bump shell-quote` (#973).
- `chore(deps): bump EnricoMi/publish-unit-test-result-action` (#990).

## Documentation

- API documentation refreshes (#997, #972, #969, #947, #944).
- Release process and README refresh (#943).

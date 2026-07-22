# Release Notes v5.0.0

**Release Date:** July 2, 2026
**Previous Version:** v4.1.1
**Node.js Requirement:** >=22

v5.0.0 is a major release. It retargets the framework's on-chain protocol bindings to **ledger-v9 / onchain-runtime-v4** (published under the new `@midnightntwrk` npm scope), adds **cross-contract call support**, changes the public `SigningKey` representation from a plain hex string to a structured `{ tag, value }` object, and delivers the first installment of **MIP-0002 contract events** on the `PublicDataProvider`. `FetchZkConfigProvider` / `NodeZkConfigProvider` now **verify ZK artifacts against the `compactc` integrity manifest** (fail-closed by default). It also adds a disposable, config-object-driven indexer provider, deflate-compressed subscriptions, and a classified deserialization-error layer.

## Breaking Changes

### Protocol swap to ledger-v9 / onchain-runtime-v4 under the `@midnightntwrk` scope (#970)

`packages/protocol` now re-exports the new-scope protocol packages:

- `@midnight-ntwrk/ledger-v8@8.1.0` → `@midnightntwrk/ledger-v9@1.0.0-rc.3`
- `@midnight-ntwrk/onchain-runtime-v3@3.0.0` → `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.3`

The subpath re-exports `@midnight-ntwrk/midnight-js-protocol/ledger` and `/onchain-runtime` now resolve to the v9 / v4 packages. The new `@midnightntwrk` scope is registered in `.yarnrc.yml` and both scope variants are flagged by the ESLint `no-restricted-imports` ACL outside `packages/protocol/src/`.

This pulls through a coordinated dependency set: `@midnight-ntwrk/platform-js@3.0.0`, `@midnight-ntwrk/compact-runtime@0.18.0-rc.1`, `@midnight-ntwrk/compact-js@2.5.5-rc.7`, and `compactc 0.33.0-rc.1` (compiler 0.33.0 / language 0.25.0 / runtime 0.18.0-rc.1).

### `SigningKey` is now a structured object (#970)

`SigningKey` changes from a plain hex string to `{ tag: 'schnorr' | 'ecdsa', value: <hex> }`:

- `ContractExecutableRuntimeOptions.signingKey` now takes the structured `SigningKey`; the Configuration layer maps it to the `KEYS_SIGNING` / `KEYS_SIGNING_KIND` config values.
- Signing-key **import validation** (`level-private-state-provider` and the testkit in-memory provider) validates the structured shape — a non-null object with a known `schnorr`/`ecdsa` tag and an even-length hex `value` (min 6 chars) — instead of the old string check.
- The shared predicate `isValidSigningKey` was extracted into `@midnight-ntwrk/midnight-js-utils`; each provider keeps a thin wrapper that throws its own `InvalidExportFormatError`.
- The DApp-connector wallet adapter (testkit) now round-trips structured `Signature` / `SignatureVerifyingKey`, emitting the `.value` (schnorr) on the wire to preserve the previous plain-hex contract.

### `ContractState` structural version bumped `[v6]` → `[v8]` (#970)

ledger-v9 bumps the structural `ContractState` tag. The version-mismatch canary expectations move accordingly. State serialized under the old protocol triggers a version-mismatch error rather than silently deserializing.

### `ZswapChainState.postBlockUpdate` requires `retentionDuration` (#970)

ledger-v9 made `retentionDuration` (seconds of past Merkle roots to retain) a required argument. Calling with the old single-argument form throws `retention_duration is out of range`. A named constant is now threaded through the production call site.

### `@midnightntwrk/wallet-sdk` 2.0.0-beta (testkit-js) (#970, #967)

The testkit wallet stack moved to the 2.0.0 major beta line (`@midnightntwrk/wallet-sdk@2.0.0-beta.2`), with aligned siblings `wallet-sdk-prover-client@2.0.0-beta.2` and `wallet-sdk-address-format@4.0.0-beta.2`, which adopts the onchain-v4 structured key/signature types. `createKeystore` now takes `{ kind: SignatureKind; secret: Uint8Array }` rather than a raw `Uint8Array`.

### ZK artifacts verified against the `compactc` integrity manifest (#1015)

`FetchZkConfigProvider` and `NodeZkConfigProvider` now verify every ZK artifact they load against the `compactc`-emitted `contract-manifest.json` (in the `compiler/` directory). Verification is **fail-closed by default** (`verify: 'require'`): a missing manifest or a digest mismatch throws `ZkArtifactIntegrityError`. Opt down to `'warn'` or `'off'`, and pin `expectedManifestHash` (SHA-256 of the manifest bytes) to defend against a coordinated swap of both the artifacts and their co-located manifest. This is a breaking change for any deployment whose local artifacts are stale, partial, or missing the manifest. See [breaking-changes.md](./breaking-changes.md).

## New Features

### Cross-contract call support (#967)

The framework can now assemble, prove, and submit **cross-contract call** transactions — a call whose tree spans several deployed contracts, each carrying its own proof:

- `ZKConfigRegistry` (in `@midnight-ntwrk/midnight-js-types`) resolves ZK artifacts across a *set* of compiled-contract sources. It requires **no address registration**: the binding is derived by joining a call's deployed verifier-key hash against each source's local verifier key, which makes resolution immune to redeploys, multiple deployments of one contract, and circuit-name collisions.
- The canonical `ContractKeyLocation` grammar (`contract:<address>/<circuitId>?vk=<sha-256>`) is re-exported from `@midnight-ntwrk/midnight-js-protocol/compact-js`, so transaction assemblers and provers share one definition.
- `PublicDataProvider` gains an "as-of" `queryBlock(config?)` endpoint returning `BlockInfo { hash, height }` (latest block when called with no argument), used to resolve on-chain state at transaction-assembly time.

### MIP-0002 contract events via `PublicDataProvider` (#988)

The `PublicDataProvider` interface gains indexer-sourced contract-event querying and streaming, per the MIP-0002 indexer-events spec (rev 2):

- `queryContractEvents(filter, page?): Promise<ContractEvent[]>` — finite, point-in-time paged read bounded by inclusive `fromBlock` / `toBlock`.
- `contractEventsObservable(filter, opts?: { startAt?: ContractEventCursor }): Observable<ContractEvent>` — replay from a start cursor (then live tail), terminable with `toBlock`.
- `getAllContractEvents(...)` — async-iterator helper that pages through a query for you.
- `ContractEvent` — an 11-variant discriminated union (`ShieldedSpend` / `ShieldedReceive` / `ShieldedMint` / `ShieldedBurn`, `UnshieldedSpend` / `UnshieldedReceive` / `UnshieldedMint` / `UnshieldedBurn` — the `Unshielded*` variants carry `sender` / `recipient` as `ContractEventAddress = { kind, value }` — plus `Paused`, `Unpaused`, `Misc { name, payload }`), alongside `ContractEventQueryFilter`, `ContractEventSubscriptionFilter`, `ContractEventCursor` (`{ fromId: number }` xor `{ fromBlock: number }`), and `ContractEventsPage`.

The mapper fails fast on an unknown `__typename` or a missing required field, and carries a compile-time exhaustiveness guard so a schema change surfaces as a type error rather than silent drift.

> The query / streaming surface covers all 11 event variants. Contract-side **emission** of MIP-0002 events requires `compactc 0.33.0-rc.1` + `compact-runtime 0.18.x` and is exercised end-to-end by an emit→indexer contract-events test (#993) for all shielded events and unshielded **mint/burn**. Unshielded **spend/receive** remain skipped pending an indexer decode fix (midnight-indexer#1279); **Misc** is skipped separately because proving `emitMisc` — the suite's heaviest circuit (~5× the next-largest zkir) — needs a proof-server-side fix.

### MIP-0002 log events on `CallResult` (#1083)

The **local-execution path** now surfaces the MIP-0002 contract log events that `compact-js` already computes — `midnight-js` was previously discarding them:

- `CallResultPublic.events` — a new `readonly LogEvent[]` field carrying the single execution-wide event list across the whole call tree, in emission order, each event tagged with its emitting contract's address. Carried **raw** (no eager decode).
- `ContractLog` is re-exported from `compact-js` through the barrel (`contracts.ContractLog`), so consumers decode with `ContractLog.decodeAll(result.public.events)` (lenient, never throws) **without** taking a direct dependency on `compact-js`.

This complements the indexer-sourced querying/streaming from #988: #988 reads events off-chain from the indexer, while this exposes them synchronously on the result of a local call.

### `provider(options)` factories for proof and ZK-config providers (#1078)

The provider layer moves toward a uniform `provider(options)` convention — wiring a provider means passing one options object instead of remembering positional-argument order. **Additive and backward-compatible**: existing positional/class usage keeps working.

- `httpClientProofProvider({ url, zkConfigProvider, timeout?, headers? })` — new object-options form with a flattened config; the positional signature is retained as a `@deprecated` overload for one release cycle (same pattern as `indexerPublicDataProvider`).
- `nodeZkConfigProvider(options)` / `fetchZkConfigProvider(options)` — thin factory functions alongside the existing `NodeZkConfigProvider` / `FetchZkConfigProvider` classes (the classes stay exported; only a consistent call-site is added).

Low-level `httpClientProvingProvider` is intentionally left positional and tracked as a follow-up.

### Deflate-compressed subscriptions (#977)

The indexer provider negotiates the `graphql-transport-ws+deflate` WebSocket subprotocol and transparently inflates compressed subscription frames (RFC 1950 zlib via the universal `DecompressionStream`, covering Node ≥ 18 and modern browsers). It falls back cleanly when the server selects the plain subprotocol, and enforces a 16 MiB hard cap on inflated payloads to guard against compression-bomb DoS.

### ZK artifact integrity manifest module (#1015)

A new `zk-artifact-manifest` module in `@midnight-ntwrk/midnight-js-utils` parses the `compactc` `contract-manifest.json`, exposing `ZkArtifactManifest`, `ZkConfigIntegrityOptions` (`verify`, `expectedManifestHash`, `onWarn`), `ZkArtifactIntegrityMode` (`'require' | 'warn' | 'off'`), and `ZkArtifactIntegrityError`. Both ZK config providers consume it (see Breaking Changes).

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

- **midnight-js:** honor per-call `proveTxConfig.timeout` (#1054, closes #974). `httpClientProofProvider().proveTx()` accepted a `ProveTxConfig` but silently discarded it — the underlying proving provider was built once with a fixed timeout, so `proveTxConfig.timeout` had no effect. The per-call timeout is now threaded down to the underlying request (per-call > construction-time > `DEFAULT_TIMEOUT`) while the provider is still built once, keeping eager URL validation and the insecure-URL warning firing only once.
- **contracts:** robustness fixes for cross-contract calls (#1034) — corrects the cached transaction context and unshielded outputs, hardens verifier-key resolution in `ZKConfigRegistry`, and realigns the indexer provider's generated GraphQL schema and query definitions.
- **midnight-js:** pass the signing-key kind via the `KEYS_SIGNING_KIND` config key (#999). The runtime previously wrote `KEYS_SIGNINGKIND`, which the config reader never matched, so `signingKind` silently fell back to `schnorr` — dropping ECDSA maintenance authority keys at deploy time and getting later ECDSA-signed updates rejected as `Malformed(InvalidCommitteeSignature)`.
- **testkit-js:** wait on the indexer healthcheck with a 3-minute startup timeout (#980).
- **testkit-js:** stretch the indexer SPO reconnect delay to keep the connection alive (#950).
- **midnight-js:** guard submit-tx debug logging against disk writes.
- **config:** pass `--no-stash` to lint-staged so it doesn't invalidate GPG signatures (#1020).

## Refactoring

- **midnight-js:** convert intersection type aliases to interfaces for clearer IDE tooltips (#629).
- **midnight-js:** wrapper consolidation, assertion hygiene, and a `pollUntilPresent` helper (#962).
- **midnight-js:** split the `indexer-public-data-provider` monolith into 7 layered files (#960).
- **utils:** extract the shared structured signing-key validation into `midnight-js-utils` (#970).
- **testkit-js:** split the CI workflow into build / e2e / prerelease for build-once fan-out (#949).

## Build & CI

- Bump the Compact toolchain to `compactc 0.33.0-rc.1` / `compact-runtime 0.18.0-rc.1` / `compact-js 2.5.5-rc.7` and regenerate all compiled artifacts (`runtime-version` stamps `0.18.0-rc.1`) (#1068, #1081 — `compact-js` `rc.6` → `rc.7`). Follows the initial `compactc 0.33.0-rc.0` / `compact-runtime 0.18.0-rc.0` bump (#1016), which switched back to the release tag/asset prefixes and superseded the earlier `compactc 0.32.102` / `compact-runtime 0.17.102` bump (#996).
- Enforce `packageManager` and `engines` consistency across the workspace via yarn constraints (#1067).
- Dedupe workflow setup, gate release concurrency, and fix coverage mapping (#1065); publish releases from CI, dropping the duplicate CD e2e run (#1033).
- Speed up e2e env startup (#1064) and cache pinned Docker images to unblock e2e parallelism (#1062).
- Stop the changelog config from collecting `BREAKING CHANGE` footer notes (#1002).
- testkit-js can build `compactc` from the `compact/` submodule (opt-in) (#978).
- Cover ECDSA contract maintenance actions and key persistence (#901), verify the MIP-0002 emit→indexer contract-events loop (#993), and add cross-contract-call tests (#1035).
- Scope e2e artifacts per environment and render CI summaries; default `TESTKIT_DOCKER_ENV` to `devnet` (#948, #970).

## Dependencies

- `build(deps): re-apply devnet stack and wallet/ledger/connector/zkir dependency bumps` (#1045) — restores the baseline reverted in #1038: `@midnightntwrk/wallet-sdk` (+ `wallet-sdk-prover-client`) `2.0.0-beta.2`, `wallet-sdk-address-format` `4.0.0-beta.2`, `@midnightntwrk/ledger-v9` `1.0.0-rc.3`, `@midnightntwrk/dapp-connector-api` `4.1.0-beta.1` (rescoped from `@midnight-ntwrk`), devnet node `2.0.0-rc.3` / proof-server `9.0.0-rc.4`. testkit-js stays on `@midnight-ntwrk/zkir-v2` `2.1.0` so the DApp-connector local prover engine and its `WasmProver` params share one zkir version.
- `chore(deps): bump graphql to 17 and graphql-codegen to v6/v7` (#1086) — `indexer-public-data-provider` now depends on `graphql ^17.0.1`.
- `chore(env): update indexer to 4.4.0-pre-alpha.16` (#1053).
- `chore(deps): bump @apollo/client 4.2.0 → 4.2.3` (#1056).
- `chore(deps): bump lint-staged to 17 and transitive security deps` (#1051).
- `chore(deps): consolidate GitHub Actions bumps` (#1049) and bump `MishaKav/jest-coverage-comment` (#1055).
- `chore(deps): migrate wallet-sdk to @midnightntwrk scope and bump to v1.2.0` (#986) (superseded by the `2.0.0-beta.2` bump in #970 / #967 / #1045).
- `chore(deps): bump shell-quote` (#973).
- `chore(deps): bump EnricoMi/publish-unit-test-result-action` (#990).

## Documentation

- API documentation refreshes (#1060, #1047, #1024, #1021, #1007, #997, #972, #969, #947, #944).
- Release notes for v5.0.0 (#1029) and release process / README refresh (#943).

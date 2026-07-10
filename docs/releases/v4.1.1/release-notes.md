# Release Notes v4.1.1

**Release Date:** June 1, 2026
**Previous Version:** v4.1.0
**Node.js Requirement:** >=22

v4.1.1 is a patch release: hardening and correctness fixes across `@midnight-ntwrk/midnight-js`, a security-driven dependency refresh, internal reorganisation of contracts governance code (public API unchanged), and a coherent error hierarchy for the indexer provider. The new error hierarchy carries one small breaking change — a single field rename on a public class.

## Breaking Changes

### `IndexerFormattedError.cause` renamed to `.errors` (#937)

The `GraphQLFormattedError[]` array carried by `IndexerFormattedError` has been moved off the ES2022 `Error.cause` slot — which is contractually a single underlying error — onto a dedicated `.errors` field. Catch sites that read `err.cause` on this class must migrate to `err.errors`. TypeScript flags this at compile time **when the caught value is narrowed to `IndexerFormattedError`**; broader catches that only narrow to `Error` will silently read `undefined`.

See [breaking-changes.md](./breaking-changes.md) for the full rationale and a before/after snippet.

## Security

### Validate signing-key entries on import (#926)

`importSigningKey` previously persisted the decrypted payload to LevelDB without inspecting individual entries. A crafted export could inject `null`, `undefined`, a non-string object, or a malformed string into the encrypted store, surfacing later as opaque transaction failures with no link back to the import event.

`level-private-state-provider` and the testkit `InMemoryPrivateStateProvider` now run a structural check on every entry **before** any `setSigningKey` call (the validator requires a hex string of even length ≥ 6). The first failing entry aborts the import via `InvalidExportFormatError` — there are no partial writes. Closes #824.

### Apply the full password policy to export operations (#922)

`exportPrivateState` and `exportSigningKey` previously enforced only the 16-character minimum, while the storage password additionally required character-class diversity, no repeated characters, and no sequential patterns. The mismatch meant a weakly-protected export could still hold real private state.

- `validatePassword` and `PasswordValidationError` moved to `@midnight-ntwrk/midnight-js-utils` so every `PrivateStateProvider` implementation shares the same policy.
- Provider export wrappers re-throw `PasswordValidationError` as `PrivateStateExportError` / `SigningKeyExportError` with `{ cause }`, preserving the public interface contract.
- `PasswordValidationError` carries a typed `reason` discriminator (`'missing' | 'too_short' | 'insufficient_classes' | 'repeated_characters' | 'sequential_pattern'`) for programmatic inspection.
- The actual password length is no longer included in the `too_short` error message to avoid leaking values through log sinks.

Closes #819.

### Warn on plain HTTP/WS for non-loopback provider URLs (#920)

`IndexerPublicDataProvider` and `HttpClientProofProvider` accept arbitrary URLs but did not warn when plain `http://` (or `ws://` for the indexer subscription endpoint) was used against a remote host. Sensitive payloads — transaction bodies, proof requests, contract state queries — could be transmitted in clear text without the dApp developer noticing.

A new `warnIfInsecureRemoteUrl` helper in `@midnight-ntwrk/midnight-js-utils` emits a single `console.warn` at provider-factory construction when the scheme is `http:` / `ws:` and the hostname is **not** `localhost`, `127.0.0.1`, or `::1`. The connection itself is not blocked — the warning is informational. The helper never throws on unparseable URLs, so future callers cannot crash provider construction through it.

Closes #818.

### Dependency security advisory bumps (#925)

Bulk dependency refresh addressing advisories from `yarn npm audit --recursive` and Dependabot. Direct bumps:

- `turbo`: `^2.9.5` → `^2.9.16` (GHSA-hcf7-66rw-9f5r login callback CSRF / session fixation)
- `commit-and-tag-version`: `^12.6.1` → `^12.7.3` (pulls in newer fast-xml-parser / yaml / git-* transitives)
- `axios` (testkit): `^1.15.0` → `^1.16.1` (resolves 11 axios advisories)
- `vitest` / `@vitest/*`: 4.1.x → 4.1.7
- `eslint`: 10.1.0 → 10.4.0; `typescript`: 6.0.2 → 6.0.3; `typescript-eslint`: 8.57.2 → 8.60.0; `rollup`: 4.60.1 → 4.60.4; `typedoc`: 0.28.18 → 0.28.19; `prettier`: 3.8.1 → 3.8.3

Resolutions added / updated (transitives pinned across the workspace):

- `fast-xml-parser` `>=5.7.0` — GHSA-jp2q-39xq-3w4g entity expansion bypass, GHSA-gh4j-gqv2-49f6 XML comment / CDATA injection, GHSA-5wm8-gmm8-39j9 fast-xml-builder attr injection
- `eslint-plugin-import/minimatch` `>=3.1.4 <4.0.0` — fixes GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74 ReDoS in minimatch v3
- `fast-uri` `>=3.1.2` — GHSA-q3j6-qgpj-74h6 path traversal, GHSA-v39h-62p7-jpjc host confusion
- `yaml` `>=2.8.3` — GHSA-48c2-rrv3-qjmp stack overflow on deeply nested collections
- `ip-address` `>=10.2.0` — GHSA-v2v4-37r5-5v8g XSS in `Address6` HTML-emitting methods
- `protobufjs` `>=7.6.1 <8.0.0` — 8 advisories; upper bound preserves grpc consumer compatibility
- `uuid` `>=11.1.1 <12.0.0` — GHSA-w5hq-g745-h8pq; transitive via `testcontainers → dockerode`
- `ws` `>=8.20.1`, `qs` `>=6.15.2`, `tmp` `>=0.2.7`, `lodash` `>=4.18.1`, `@protobufjs/utf8` `>=1.1.1`

Verification: `yarn npm audit --recursive --severity high` reports no advisories; remaining moderate entries are deprecation notices on `git-raw-commits` / `git-semver-tags` (not vulnerabilities).

## Bug Fixes

### Harden error handling in `indexer-public-data-provider` (#937)

A coherent `IndexerError` hierarchy replaces the mix of generic `new Error(...)` throws and non-null assertions previously sprinkled through the indexer provider. Every error this provider raises is now a subclass of the new abstract `IndexerError`, so consumers can catch them with a single `instanceof IndexerError` check (matching the `PrivateStateImportError` precedent in `@midnight-ntwrk/midnight-js-types`).

Closed silent-failure and crash paths:

- **`IndexerFormattedError` output was reversed and increasingly nested** — the `reduce` accumulator was appended at the *end* of each iteration, producing growing tab indentation and inverted error order. Replaced with `map().join('\n\t')` for an ordered numbered list. Existing tests used `toContain` which masked the regression — now strict `toBe` equality (Closes #823).
- **Apollo errors were re-wrapped as plain `new Error(message)`**, discarding the original transport details, GraphQL errors, and stack. Now wrapped in `IndexerQueryError` carrying the Apollo error via `Error.cause` (Closes #822).
- **Non-null assertions on subscription payload fields** (`data.blocks!`, `data.contractActions!.state`, `data.contractActions!`) replaced with explicit null checks raising `IndexerSubscriptionDataError`. The error names the missing field (typed as the literal union `'blocks' | 'contractActions'`) for actionable diagnostics (Closes #821).
- **`queryDeployContractState` crashed with a cryptic `TypeError`** when the deploy transaction lacked a contract action for the requested address (was `find(...)!.state`). Now raises `IndexerDataError` (`kind: 'missing-contract-action'`).
- **`watchForDeployTxData` returned `undefined` as a "valid" `txId`** when the indexer's `identifiers` array lacked the slot the contract-action index pointed to. Worse than a crash — it propagated `undefined` (and previously: empty strings) into `FinalizedTxData.txId`. Now raises `IndexerDataError` (`kind: 'missing-identifier'`) with the contract address, action index, and identifiers length. Correlation extracted into an `@internal` `correlateDeployTxId` helper with narrow types for cast-free testing.
- **`toTxStatus` threw a generic `Error`** for unknown transaction-status enum values. Now raises `IndexerDataError` (`kind: 'unknown-status'`).
- **`unshieldedBalancesObservable`'s `txId` branch threw a generic `Error`** for an unsupported config. Now raises `IndexerProviderConfigError`, distinguishing API misuse from server-side issues.
- **Remaining non-null assertions on `data.contractAction!`** in `waitForContractToAppear` and `waitForUnshieldedBalancesToAppear` replaced with a `hasContractAction` type predicate so the type narrows through the Rx filter without a type-level lie. Removing the filter is now a compile error instead of a runtime crash.

Error hierarchy:

```
IndexerError (abstract)
├── IndexerFormattedError         GraphQL errors returned by server (errors[])
├── IndexerQueryError             Apollo transport / query failure (cause preserved)
├── IndexerSubscriptionDataError  Missing top-level field in subscription payload
├── IndexerDataError              Structurally inconsistent indexer response (discriminated context)
│     ├── kind: 'unknown-status'
│     ├── kind: 'missing-contract-action'
│     └── kind: 'missing-identifier'
└── IndexerProviderConfigError    Consumer passed unsupported configuration
```

### Emit contract state for `blockHeight` / `blockHash` configs (#911)

`contractStateObservable` was silently producing an empty observable when configured with `type: 'blockHeight'` or `type: 'blockHash'`. The cause was a misplaced `Rx.filter(isRegularTransaction)` applied to `ApolloQueryResult` emissions from `waitForBlockToAppear` — those results never carry the `identifiers` / `hash` properties the filter checks for, so every emission was dropped.

The filter was introduced during the ledger 6 migration and was at odds with the parallel `unshieldedBalancesObservable` path, which already calls `waitForBlockToAppear` without it.

Tests added:

- Behavioural assertion that `BLOCK_QUERY` and `TXS_FROM_BLOCK_SUB` are dispatched for both `blockHeight` and `blockHash` configs, and that no subscription is dispatched when the indexer returns no block.
- Unit test locking in that `isRegularTransaction` rejects block-query result shapes — prevents silent reintroduction of the original filter.

Closes #805.

## Refactoring

### Co-locate contracts governance code under `src/governance/` (#909)

Internal reorganisation of `@midnight-ntwrk/midnight-js-contracts`. All maintenance-authority code (`submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`, `submitReplaceAuthorityTx`, their error classes, and the related `CircuitMaintenanceTxInterface*` / `ContractMaintenanceTxInterface` types) now lives under `packages/contracts/src/governance/`.

**Public API is unchanged.** The package barrel (`index.ts`) re-exports from the new `./governance` subpath, so every export available in v4.1.0 remains available at the same import path in v4.1.1:

```typescript
// Continues to work identically in v4.1.1
import {
  submitInsertVerifierKeyTx,
  submitReplaceAuthorityTx,
  InsertVerifierKeyTxFailedError,
  type CircuitMaintenanceTxInterface
} from '@midnight-ntwrk/midnight-js-contracts';
```

The `./governance/unproven-tx` helpers are intentionally **not** re-exported — they remain package-private. Public callers were not previously able to import them.

## Dependencies

### Runtime Dependencies Updated

- `@midnight-ntwrk/ledger-v8`: `8.0.3` → `8.1.0` (consumed via `@midnight-ntwrk/midnight-js-protocol/ledger` — no consumer code changes) (#919)

### Testkit Dependencies

- `@midnight-ntwrk/wallet-sdk`: `1.0.0` → `1.1.0` (#919)
- `axios` (testkit-js, testkit-js-e2e): `^1.15.0` → `^1.16.1` (#925)

### Development Dependencies Updated

- `turbo`, `vitest`, `eslint`, `typescript`, `typescript-eslint`, `rollup`, `typedoc`, `prettier`, `commit-and-tag-version` — see Security section above for versions and advisory references (#925)

### Build & Constraints

- Yarn Constraints rule enforces consistent dependency versions across the workspace — divergence is now a `yarn constraints` failure (#914)
- Build-time dependencies scoped to the packages that need them; unused root `devDependencies` removed (#916)
- Missing dependencies declared explicitly; enforcement wired through ESLint (#913)

## Features (non-core)

These additions are isolated to `testkit-js` — they do **not** affect the publicly consumed midnight-js packages.

### Parameterised compose image versions + nightly e2e matrix (#917)

`testkit-js` `MidnightTestContainers` now accepts compose-image versions via configuration instead of hardcoded tags, enabling the nightly e2e matrix to exercise multiple indexer/node combinations.

### `qanet` support via NIGHT/dust faucet flow (#73a3fd59)

`testkit-js` gains a faucet-based funding path for `qanet`, mirroring the existing devnet/testnet flows.

## Tests

- Regression test in `testkit-js-e2e` for shielded segment routing (the v4.1.0 #876 fix path) — locks in correct guaranteed/fallible offer routing for LP-token mints and similar fallible-segment operations (#903)
- Coverage added in `level-private-state-provider` and `InMemoryPrivateStateProvider` for the signing-key import validator (#926)
- `getPasswordFromProvider` tests refactored to assert via `PasswordValidationError` + `reason` discriminator instead of fragile string matching (#922)

## Documentation

- Provider semantics and transaction privacy clarified in the `@midnight-ntwrk/midnight-js` README (#918)
- API documentation regenerated for the new release surface (#939, #934, #924, #910)

## CI

- Pinned GitHub Actions bumped to latest versions across all workflows (#927)
- `testkit-js` nightly e2e: concurrency group is now scoped by `testkit_docker_env`, so the five per-environment matrix legs no longer cancel one another. Non-nightly callers (`ci.yml`, `cd.yml`) fall back to a `'default'` group, preserving the existing single-group-per-branch behaviour (#935)

## Links

- [Breaking Changes Details](./breaking-changes.md) — one field rename
- [New Features Guide](./new-features.md)
- [Migration Guide](./migration-guide.md)
- [API Changes Reference](./api-changes.md)
- [v4.1.0 Release Notes](../v4.1.0/release-notes.md)

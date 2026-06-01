# midnight-js v4.1.1 Release Documentation

**Release Date:** June 1, 2026
**Previous Version:** v4.1.0
**Migration Complexity:** Minimal — one error-field rename (`IndexerFormattedError.cause` → `.errors`); otherwise drop-in

## Quick Links

- [Release Notes](./release-notes.md) - High-level changelog
- [Breaking Changes](./breaking-changes.md) - One field rename on `IndexerFormattedError`
- [New Features](./new-features.md) - None in core (testkit-js tooling only)
- [Migration Guide](./migration-guide.md) - Dependency bump plus one find-and-replace
- [API Changes](./api-changes.md) - Re-exports, additive helpers, new indexer error hierarchy

## Breaking Changes (1)

- **`IndexerFormattedError.cause` renamed to `.errors`** — the GraphQL-error array carried by `IndexerFormattedError` has moved off the ES2022 `Error.cause` slot (which is contractually a single underlying error) onto a dedicated `.errors` field. Catch sites that read `err.cause` must migrate to `err.errors`. TypeScript flags this at compile time when the caught value is narrowed to `IndexerFormattedError`; broader catches that narrow only to `Error` need a manual grep (#937)

## Notable Behaviour Changes

- **Indexer provider raises typed errors instead of generic `Error` / non-null-assertion crashes** — Apollo failures, missing subscription fields, structurally inconsistent indexer rows, and unsupported observable configs now raise dedicated subclasses of a new `IndexerError` base. Previously these would either propagate as opaque `new Error("...")` instances or silently produce `undefined` values downstream (e.g. an empty-string `txId` in `FinalizedTxData`) (#937)
- **Signing-key import validates entries up-front** — a single malformed entry now aborts the import without partial writes (was: opaque failure at later `submitTx`) (#926)
- **Export/import password policy aligned with storage policy** — `exportPrivateState` / `exportSigningKey` now reject weak passwords (insufficient character classes, repeated characters, sequential patterns) instead of accepting any 16-char string (#922)
- **`contractStateObservable` now emits for `blockHeight` / `blockHash` configs** — previously produced an empty observable due to a misplaced internal filter (#911)
- **Plain `http://` / `ws://` provider URLs against non-loopback hosts log a one-shot `console.warn`** at provider construction — informational only; connections are not blocked (#920)

## Key Security Fixes

- Signing-key import payload validation prevents crafted exports from injecting `null`, `undefined`, or malformed strings into the encrypted store (#926)
- Full password policy (length + classes + no repeats + no sequences) is now applied to export/import operations, closing the gap with storage password enforcement (#922)
- `console.warn` emitted at provider construction when sensitive payloads (transaction bodies, proof requests, contract state queries) would be transmitted in clear text to a non-loopback host (#920)
- Security advisory dependency bumps: `axios`, `protobufjs`, `uuid`, `ws`, `qs`, `picomatch`, `postcss`, `yaml`, `ip-address`, `fast-uri`, `fast-xml-parser`, `minimatch`, `turbo` (#925)

## Key Bug Fixes

- `contractStateObservable({ type: 'blockHeight', blockHeight }) ` and `({ type: 'blockHash', blockHash })` now emit the contract state at the requested block instead of completing silently with no value (#911)
- `watchForDeployTxData` previously masked a missing identifier slot behind a non-null assertion — when the indexer returned `identifiers[findIndex(...)] === undefined`, the value silently became the `txId` of `FinalizedTxData`. Now raises `IndexerDataError` with the correlating contract address, action index, and identifiers length (#937)
- `queryDeployContractState` no longer crashes with a cryptic `TypeError` when the deploy transaction lacks a contract action for the requested address; raises `IndexerDataError` (`kind: 'missing-contract-action'`) instead (#937)
- Apollo transport failures, GraphQL-error responses, and malformed subscription payloads from the indexer are now distinguishable in `catch` blocks (`IndexerQueryError` vs `IndexerFormattedError` vs `IndexerSubscriptionDataError`) — previously all collapsed to either `new Error(message)` or a non-null-assertion crash (#937)

## Quick Migration

Most consumers need only the dependency bump:

```bash
yarn upgrade @midnight-ntwrk/midnight-js@4.1.1
yarn install
```

If you `catch` `IndexerFormattedError` and narrow the caught value to that type, rename `.cause` to `.errors`:

```diff
  } catch (e) {
    if (e instanceof IndexerFormattedError) {
-     console.error('GraphQL errors:', e.cause);
+     console.error('GraphQL errors:', e.errors);
    }
  }
```

See [migration-guide.md](./migration-guide.md) for caveats around broader `catch` shapes.

## Requirements

- **Node.js:** 22+
- **TypeScript:** 5.0+

## Testing Checklist

- [ ] TypeScript compilation passes (the `IndexerFormattedError.cause` → `.errors` rename surfaces narrowed-catch call sites here)
- [ ] Grep for `err.cause` in any `catch` block that handles indexer paths — broader catches that don't narrow to `IndexerFormattedError` typecheck under v4.1.1 but silently return `undefined`
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] If catching `IndexerFormattedError`: rename reads of `err.cause` to `err.errors`
- [ ] If using `contractStateObservable` with `blockHeight` / `blockHash` configs: verify emissions are received (regression fix)
- [ ] If exporting private state or signing keys: confirm export passwords satisfy the storage password policy (otherwise export now fails)
- [ ] If using provider URLs against remote hosts: review the new insecure-URL warning and switch to `https://` / `wss://` where applicable

---

**Last Updated:** June 1, 2026
**License:** Apache-2.0

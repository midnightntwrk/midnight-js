# ADR 0001 — compact-js owns the local-execution event surface; the indexer path stays independent

**Status:** Accepted
**Date:** 2026-07-09
**Related:** [MIP-0002](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/main/mips/mip-0002-public-contract-log-emission.md), PR #1083, PR #1081

## Context

Contract log events (MIP-0002) reach TypeScript consumers via two independent paths:

- **Local execution** (`packages/contracts`) — the circuit runs in-process before submission; `compact-js` produces `ContractExecutable.CallResult.events: LogEvent[]` from the runtime's `publicTranscript`.
- **Indexer** (`packages/indexer-public-data-provider`) — after chain inclusion; events arrive over the indexer's GraphQL surface, already decoded server-side.

The same event *concept* is declared in three places with different representations:

| Source | Casing | Role |
|---|---|---|
| `compact-js` `LogEventType` | kebab (`shielded-spend`) | what the ledger/runtime emits (local path) |
| `midnight-js` `ContractEventType` | Pascal (`ShieldedSpend`) | our public union |
| indexer GraphQL schema | SCREAMING_SNAKE (`SHIELDED_SPEND`) | what the indexer serves |

There is no single TypeScript source of truth across all three. The indexer is a separately deployed service and can legitimately lag or lead the ledger/`compact-js` version.

## Decision

1. **`compact-js` is the authority only for the local-execution path.** Surface its `events` on `CallResultPublic.logEvents` (named to distinguish these raw log emissions from the decoded indexer `ContractEvent` surface), carried **raw**, and re-export `ContractLog` (so consumers decode via `ContractLog.decodeAll` without depending on `compact-js` directly).
2. **The indexer path is NOT coupled to `compact-js`.** Its authority is the generated indexer GraphQL schema. `ContractEventType` ↔ schema parity is already compile-enforced by `Record<ContractEventType, IndexerContractEventType>` plus the `__typename` exhaustiveness switch in `toContractEvent` — no `compact-js` coupling is added.
3. **Representation choices** on the local path: events forwarded **raw** (the `compact-js` payload decoder is `@experimental`), **execution-wide** across the whole call tree in emission order (each tagged with its emitting contract address), and the **deploy/constructor path is excluded** (`compact-js` `DeployResultPublic` carries no events).

## Consequences

- Normal skew between the indexer and `compact-js` (independent deployments) does not manifest as false CI failures or pressure to change the public type against the wrong authority.
- Consumers on the local path get a typed decoder without taking a direct `compact-js` dependency.
- There is still no single TypeScript source of truth spanning both paths. True unification requires a generated TypeScript schema artifact emitted from the ledger's Rust `LogEventType` enum (MIP-0002 §7, Option A). Tracked as an upstream (ledger team) ask.
- Non-empty events require the compiler to emit `log` ops; until the bundled `compactc` does, `events` is `[]` in practice. The forwarding is nonetheless covered independent of the payload: the direct executor→`CallResultPublic` path is asserted against `[]`, and the scoped-transaction rebuild path is asserted by reference identity (so a dropped or hardcoded forward fails the test).

## Alternatives rejected

- **Couple the indexer union to `compact-js` (a `LogEventType` parity test).** Would turn normal indexer↔`compact-js` skew into red CI and force changes to the public type to satisfy an authority that does not feed that path.
- **Decode indexer event bytes through `compact-js`.** A decoder pinned to one ledger version decoding bytes served by a differently-versioned indexer risks silent mis-decoding.
- **Eager-decode the events / expose root-only events.** Rejected: the payload decoder is `@experimental` (a wrong offset decodes silently to a wrong value), and root-only would drop cross-contract events.

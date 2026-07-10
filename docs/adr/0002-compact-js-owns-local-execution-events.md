# 0002. Forward contract log events from local execution; keep the indexer path independent

- Status: Accepted
- Date: 2026-07-09
- Deciders: Szymon Paluchowski
- Related: [MIP-0002](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/main/mips/mip-0002-public-contract-log-emission.md), PR #1083, PR #1081

## Context

Contract log events (MIP-0002) reach TypeScript consumers via two independent paths:

- **Local execution** (`packages/contracts`) — the circuit runs in-process before submission; `compact-js` produces `ContractExecutable.CallResult.events: LogEvent[]` from the runtime transcript.
- **Indexer** (`packages/indexer-public-data-provider`) — after chain inclusion; events arrive over the indexer's GraphQL surface, already decoded server-side.

The same event concept is declared in three places with different representations: `compact-js` `LogEventType` (kebab), `midnight-js` `ContractEventType` (Pascal), and the indexer GraphQL schema (SCREAMING_SNAKE). There is no single TypeScript source of truth across all three, and the indexer is a separately deployed service that can legitimately lag or lead the ledger/`compact-js` version.

Before this change, `midnight-js` discarded the executor's events entirely — `unproven-call-tx.ts` destructured the `compact-js` result without them.

## Decision

We will surface `compact-js`'s log events on the local-execution path only, as `CallResultPublic.logEvents` — named to distinguish these raw log emissions from the decoded indexer `ContractEvent` surface. They are carried **raw** (`readonly LogEvent[]`), execution-wide across the whole call tree in emission order, each tagged with its emitting contract's address. We re-export `compact-js`'s `ContractLog` and `compact-runtime`'s `LogEvent` from `packages/contracts`, so consumers name and decode events (via `ContractLog.decodeAll`) without depending on `compact-js`/`compact-runtime` directly.

We will **not** couple the indexer path to `compact-js`. Its authority is the generated indexer GraphQL schema; `ContractEventType` ↔ schema parity is already compile-enforced by `Record<ContractEventType, IndexerContractEventType>` plus the `__typename` exhaustiveness switch in `toContractEvent`.

The deploy/constructor path is excluded — `compact-js` `DeployResultPublic` carries no events.

## Consequences

- **Positive:** normal skew between the indexer and `compact-js` (independent deployments) never manifests as false CI failures, nor as pressure to change the public type against the wrong authority. Local-path consumers get a typed decoder without a direct `compact-js` dependency.
- **Negative:** there is still no single TypeScript source of truth spanning both paths — the two remain separate declarations. `compact-js`'s payload decoder is `@experimental`, so a successful decode can still yield a silently-wrong payload.
- **Follow-ups:** true cross-path unification needs a generated TypeScript schema artifact emitted from the ledger's Rust `LogEventType` enum (MIP-0002 §7, Option A) — an upstream (ledger team) ask. Non-empty events also await a compiler that emits `log` ops; until then `logEvents` is `[]` in practice, and the forwarding is covered by asserting the executor→`CallResultPublic` path against `[]` and the scoped-transaction rebuild path by reference identity.

## Alternatives considered

- **Couple the indexer union to `compact-js` (a `LogEventType` parity test):** rejected — would turn normal indexer↔`compact-js` skew into red CI and force public-type changes to satisfy an authority that does not feed that path.
- **Decode indexer event bytes through `compact-js`:** rejected — a decoder pinned to one ledger version decoding bytes served by a differently-versioned indexer risks silent mis-decoding.
- **Eager-decode the events, or expose root-only events:** rejected — the payload decoder is `@experimental` (a wrong offset decodes silently to a wrong value), and root-only would drop cross-contract events.

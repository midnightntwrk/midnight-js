# 0002. Forward contract log events from local execution; keep the indexer path independent

- Status: Accepted
- Date: 2026-07-09
- Related: [MIP-0002](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/main/mips/mip-0002-public-contract-log-emission.md)

## Context

Contract log events (MIP-0002) reach TypeScript code by two independent paths:

- **Local execution** (`packages/contracts`). The circuit runs in-process before submission, and
  `compact-js` returns the events it read from the runtime transcript.
- **Indexer** (`packages/indexer-public-data-provider`). After the transaction is on chain, the
  events arrive over the indexer's GraphQL API, already decoded by the server.

The same event concept is declared in three places with three spellings: `compact-js`
(kebab-case), `ContractEventType` in `types` (PascalCase) and the indexer GraphQL schema
(SCREAMING_SNAKE). No single TypeScript source spans all three. The indexer is a separately
deployed service, so it can lag or lead the ledger and `compact-js` versions.

## Decision

We will surface `compact-js`'s log events on the local-execution path only, as
`Ledger9CallResultPublic.logEvents`. The name keeps these raw log emissions apart from the
decoded indexer `ContractEvent`.

- The events are carried **raw** (`readonly LogEvent[]`). The list covers the whole call tree in
  emission order, and each event names the address of the contract that emitted it.
- `contracts` re-exports the decoder as `Ledger9ContractLog` and the event type as
  `Ledger9LogEvent`, so consumers name and decode events (`Ledger9ContractLog.decodeAll`) without
  a direct `compact-js` or `compact-runtime` dependency.
- The deploy (constructor) path has no events: `compact-js`'s deploy result carries none.
- `Ledger8CallResultPublic` has no `logEvents`. The retained toolchain has no log-event concept,
  so there is no value to carry.

We will **not** couple the indexer path to `compact-js`. Its authority is the generated indexer
GraphQL schema. Parity between `ContractEventType` and the schema is checked by the compiler: a
`Record<ContractEventType, IndexerContractEventType>` in `events-filter.ts` and the exhaustive
`__typename` switch in `toContractEvent`.

## Consequences

- **Positive:** normal version skew between the indexer and `compact-js` never shows up as a
  false CI failure, or as pressure to change a public type against the wrong authority.
- **Positive:** local-path consumers get a typed decoder without depending on `compact-js`.
- **Negative:** there is still no single TypeScript source of truth across both paths.
- **Negative:** `compact-js`'s payload decoder is `@experimental`. A successful decode can still
  return a wrong payload without any error.
- **Follow-up:** true unification needs a TypeScript schema generated from the ledger's Rust
  `LogEventType` enum (MIP-0002 section 7, option A). That is an ask for the ledger team.

## Alternatives considered

- **A parity test between the indexer union and `compact-js`'s `LogEventType`.** Rejected: normal
  indexer/`compact-js` skew would turn CI red and force public-type changes to satisfy an
  authority that does not feed that path.
- **Decode indexer event bytes through `compact-js`.** Rejected: a decoder pinned to one ledger
  version, decoding bytes from an indexer on another version, can mis-decode silently.
- **Decode the events eagerly, or expose only the root call's events.** Rejected: the decoder is
  `@experimental`, so eager decoding can hide wrong values; root-only would drop the events of
  cross-contract calls.

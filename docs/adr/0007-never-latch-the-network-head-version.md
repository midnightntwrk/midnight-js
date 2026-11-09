# 0007. Never latch the network head version

- Status: Accepted
- Date: 2026-09-04
- Related: [ADR 0006](./0006-version-tagged-payloads-at-provider-seams.md), [ADR 0020](./0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md)

## Context

Across the ledger fork the framework asks two different questions about eras.

**Which era does this value belong to?** The answer comes with the data. Every era-sensitive read
in `@midnight-ntwrk/midnight-js-indexer-public-data-provider` selects `protocolVersion` as a sibling
of the bytes it returns, in the same GraphQL document. A state's era is read from the version tag
at the start of its bytes (`SerializedContractState` and its siblings); the record's
`protocolVersion` dates the block. A transaction record's era comes from its `protocolVersion`,
because a transaction is written by the era of the block that includes it. This is per record, so a
history read that spans the fork returns records of both eras correctly.

**Which era will a transaction I build now land in?** No record answers this: the transaction lands
in a future block. The only signal is the network head version, which
`PublicDataProvider.queryLatestProtocolVersion()` reports and `latestNetworkLedgerVersion` maps to a
`LedgerEra`. `UnknownProtocolVersionError` carries `path: 'construct' | 'read'` because these are two
different paths.

Two more facts:

- A head reading is only a lower bound. The era can advance between building and inclusion. A
  client cannot close that window.
- A deploy has no prior state to date it, and its era mistake is the worst one: a contract
  deployed with the wrong runtime is a permanent on-chain artifact.

## Decision

We will never latch the network head version. It is read fresh, or served from a cache that
expires by itself. The era of data already read comes from that data, never from a head reading.

- `queryLatestProtocolVersion(): Promise<number>` takes no arguments. An implementation may cache
  the answer only if the cache expires by itself, on a bound short relative to block time. A
  reading held indefinitely is forbidden.
- `IndexerPublicDataProvider` caches nothing: one `HEAD_PROTOCOL_VERSION_QUERY` with
  `fetchPolicy: 'no-cache'` per call.
- A head reading is not evidence about any record, and a record's era is not evidence about where
  the network is now. A provider must not substitute one for the other.
- A read never issues a head request as a side effect. A read costs the requests the caller asked
  for.

Where the head is read (`readHeadEra` in `packages/contracts/src/internal/era.ts`, once per
operation, nothing cached across calls):

- **Current-era deploy.** `submitLedger9DeployTx`, which `deployContract` and `submitDeployTx`
  reach, reads the head after the artifact and config checks and before the constructor runs. A
  pre-fork head is refused with `EraMismatchError`, reason `'ledger9-artifact-on-ledger8-network'`,
  before anything is proven.
- **Retained-era operations.** `resolveOperationEra` reads the head and acquires the era facade
  (`acquireHeadEra`); `assertEraCompatible` rules the `(artifact era, head era)` pair against
  `ERA_PAIRING`.
- **`submitTx` with a handle.** It reads the head once and refuses a handle whose era is not the
  head's with `EraMismatchError`, before proving.
- **A scoped transaction.** The root scope reads the head once (`readScopeHead`) and runs the
  scope of that era. A nested scope reuses the outer scope's era.
- **After a rejected submission.** `handleSubmitRejection` reads the head once more, to tell a
  fork crossed during the operation (`ForkCrossedDuringOperationError`) from an ordinary rejection.

A head the client cannot place on the era timeline is refused (`UnknownProtocolVersionError`,
`path: 'construct'`), never guessed. `NODE_MAJOR_TO_LEDGER` maps node majors 1 and 2 only, on
purpose.

A current-era single call and the current-era transaction builders (`createLedger9UnprovenDeployTx`
and the like) read no head. After submission, the finalized record's own era confirms where the
transaction landed: a current-era flow refuses a v8 record (`requireLedger9Record`).

## Consequences

- The next fork (v9 to v10) is observed, not reported away by a stale value.
- Every implementation is free to cache or not, within one bound; there is no protocol to copy.
- A deploy pays one small extra request. A consumer that polls the head in a loop pays per
  iteration.
- The bound is prose, not a type. A latching implementation is a review finding, not a build
  failure.
- The window between building and inclusion stays open. A fork crossed in that window is detected
  only after the fact, from the record or from the re-read after a rejection.

## Alternatives considered

- **Cache the head behind a corroboration protocol that only moves forward.** Rejected: on the
  next fork nothing would clear the stored value, so it would misreport exactly at the era
  boundary, the only place the answer matters.
- **Cache with a TTL, or coalesce concurrent head reads.** Allowed by the contract above, not
  implemented: no measured cost justifies it.
- **Cache the era and clear it on any record that contradicts it.** Not implemented; the shape to
  prefer if an unbounded answer is ever needed, since every read already carries its own era.
- **Take the construct-path era from the last state read.** Rejected: deploys read no state, and it
  answers a question about bytes with a question about the network.

# 0008. Never latch the network head version

- Status: Accepted
- Date: 2026-09-04
- Deciders: Szymon Paluchowski

## Context

Across the ledger fork this framework has to answer two different questions
about eras, and they have different shapes.

**Which era does this record belong to?** Every era-sensitive read in
`@midnight-ntwrk/midnight-js-indexer-public-data-provider` now selects the
`protocolVersion` that dates the bytes it returns as a sibling field of those
bytes in the same GraphQL document — `CONTRACT_STATE_QUERY`,
`RAW_CONTRACT_STATE_QUERY`, `CONTRACT_AND_ZSWAP_STATE_QUERY`, `TX_ID_QUERY`,
`DEPLOY_TX_QUERY`, `DEPLOY_CONTRACT_STATE_TX_QUERY`, `CONTRACT_STATE_SUB` and
`TXS_FROM_BLOCK_SUB`. The era therefore arrives with the data, per record, at
no extra round trip, and `RawContractState.version` and
`VersionedFinalizedTxData.version` are derived from it rather than asserted.
That is also the granularity a history read needs: a read spanning the fork
returns records from both eras at once, which no single "where is the network"
answer can describe.

**Which era will a transaction I am building now land in?** No record answers
this. The transaction lands in a future block. The only available signal is the
network's current head version, which `PublicDataProvider.queryLatestProtocolVersion`
reports and `networkHeadVersion` (`packages/protocol/src/version.ts`) resolves
to a `LedgerVersion`. The distinction is already in the error surface: an
`UnknownProtocolVersionError` carries `path: 'construct' | 'read'` precisely
because these are two paths.

Two further facts shape the decision:

- A head reading is itself only a lower bound on the answer to the second
  question. Inclusion happens after construction, and an era can advance in
  between. Nothing available to a client closes that window; only the node's
  fork schedule would, and this framework does not read it.
- Of the write paths, only deploy has no prior state to date. A call reads the
  contract state it executes against, so its era arrives with that read. A
  deploy has no such read — and it is also the write whose era mistake is
  worst, because a contract deployed with the wrong-era runtime is a permanent
  on-chain artifact with an address already handed out, not a transaction that
  can be rebuilt and resubmitted.

An earlier iteration of the fork work cached the head reading behind a
"corroboration" protocol: `IndexerPublicDataProvider` stored the head version
once it had seen either a state read whose envelope and head version both
reported the newer era, or a finalized record it had decoded itself. The stored
value only ever moved forward, and the interface required the same protocol of
every implementation.

## Decision

We will never latch the network head version: it is either read fresh, or
served from a cache that expires by itself. Read-path era questions are
answered from per-record data instead, not from a head reading at all.

Concretely:

- `PublicDataProvider.queryLatestProtocolVersion(): Promise<number>` takes no
  arguments. Its contract permits a cache on one condition: the cached answer
  must **expire by itself**, on a bound short relative to block time. What it
  forbids is a reading held indefinitely — a latch. The condition is what makes
  the member need no freshness option: under a bound, every answer is at most
  one bound old, so there is nothing to opt out of.
- `IndexerPublicDataProvider` takes the simplest option the contract allows and
  caches nothing: one `HEAD_PROTOCOL_VERSION_QUERY` with
  `fetchPolicy: 'no-cache'` per call. There is no measured cost to spend a
  cache on, and an expiring cache is not free to get right.
- The era of data already read is answered by the `protocolVersion` the read
  itself carries, never by a head reading. A provider must not substitute one
  for the other in either direction: a head reading is not evidence about the
  bytes of any particular record, and a record's version is not evidence about
  where the network is now.
- A read must not issue a head request as a side effect of the caller's
  request. This is what makes the per-call cost of a read predictable.

**How the deploy path resolves its era.** Deploy is the one call site that
needs the head reading, and it resolves the era in three steps:

1. Read the head version fresh, immediately before composing, and resolve it
   with `networkHeadVersion`. One request per deploy — the rarest write in the
   framework, once per contract.
2. Compose with the era that resolves to. A version the client cannot place on
   the era timeline is a refusal (`UnknownProtocolVersionError` with
   `path: 'construct'`), never a guess: this is the fail-closed direction, and
   `protocolVersionToLedger`'s narrower-than-the-indexer table
   (`NODE_MAJOR_TO_LEDGER`, node majors 1 and 2 only) is deliberate for the
   same reason.
3. Confirm after the fact from the `protocolVersion` on the finalized record
   that `watchForDeployTxData` returns. That closes the construction-to-
   inclusion window in the only way a client can: by observing which era the
   deploy actually landed in, rather than by asserting the era it was built
   for.

Step 1 is not wired into `createUnprovenDeployTx` yet, and this ADR does not
add it. The flows in `packages/contracts` are v9-only today (`requireV9`,
`requireV9Record`, `unwrapV9`), so resolving the era there would produce only an
earlier refusal that `requireV9` already produces, at the cost of a request —
a second era arm has to exist for the choice to mean anything. It lands with
MJS-02/MJS-03, and this ADR is what it will be built against.

## Consequences

- **Positive:** the answer to "which era is the network on" cannot be latched,
  so the next fork (v9 to v10) is observed rather than reported away; a read
  costs exactly the requests the caller asked for, with no corroborating
  request bolted on; the interface loses a five-paragraph protocol prescribing
  *how* to corroborate, which every future `PublicDataProvider` implementation
  would have had to reproduce, and gains one bound instead — an implementation
  is free to cache or not, and either choice is correct; the read path's era
  answer is per-record, which is the granularity a fork-spanning history read
  needs; `queryLatestProtocolVersion` means what its name says, to within one
  bound.
- **Negative:** the deploy path will pay one extra small request per deploy
  once step 1 is wired; as long as no implementation takes up the bounded
  cache, a consumer that polls the head version in a loop pays per iteration;
  the bound is stated in prose and cannot be type-checked, so an implementation
  that latches anyway is a review question rather than a build failure; and the
  construction-to-inclusion window stays open — this decision narrows it to the
  smallest a client can achieve, but only step 3's after-the-fact confirmation
  detects a crossing, and only after the fact.
- **Follow-ups:** wire the deploy-path resolution (steps 1 and 2) with
  MJS-02/MJS-03, when a second era arm exists to choose between. If head reads
  ever become a measured cost, two shapes are open and neither is a return to
  corroboration: an expiring cache inside the provider, as the contract above
  allows; or, cheaper and with no staleness at all, coalescing concurrent
  in-flight head reads into one request — the same promise-memo discipline
  `loadLedgerEra` uses, but released the moment it resolves, so it bounds
  bursts without ever answering from the past.

## Alternatives considered

- **Cache the head reading behind a corroboration protocol** (the
  implementation this ADR removes) — rejected on three grounds. First, an
  inverted risk profile: `corroborateV9` only ever raised the stored value and
  only from a newer-era reading, so on a move to v10 nothing would clear it and
  the provider would report v9 for the life of the process. It saved a request
  mid-era, where the answer is stable and uninteresting, and misreported at the
  era boundary, which is the only place the answer matters. Second, it was
  inert in the window it was built for: its own contract forbade caching while
  the network was still on the older era, so it did nothing during the v8-to-v9
  transition and engaged only afterwards. Third, its net cost was negative:
  corroborating from a finalized record issued an extra head request on every
  `watchForTxData`/`watchForDeployTxData` until it engaged, repeating on every
  finalized transaction whenever the head read failed or the head was still
  pre-fork.
- **Cache with a TTL, or memoise within one flow** — **permitted** by the
  contract above, and simply not implemented here. It is the defensible shape:
  bounded staleness, trivial to explain, no protocol in the interface. It is
  not implemented because the cost it would save has not been measured, and the
  only call site that needs the head reading is the rarest write in the
  framework — but an implementation that wants it does not need a new ADR.
- **Cache the era, with invalidation on a contradicting record** — not
  implemented, and recorded here as the shape to prefer if an unbounded answer
  is ever genuinely wanted. It caches the monotone quantity (the era, not a head integer, so the
  "era does not go backwards" argument actually applies to what is stored), and
  because every read now carries its own `protocolVersion`, reads become a
  free continuous cross-check: any record whose era contradicts the cached one
  clears it. `requireV9Era` (`packages/indexer-public-data-provider/src/era.ts`)
  already sees every record and is the natural hook. That inverts the rejected
  design — light continuous invalidation on contradiction, instead of heavy
  one-shot corroboration on entry.
- **Derive the construct-path era from the last state read instead of a head
  read** — rejected: it works for calls, which read state anyway, and not at
  all for deploys, which read none. It would also silently substitute an answer
  about specific bytes for an answer about the network, which is the conflation
  the decision above forbids.

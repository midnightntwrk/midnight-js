# Era-tagged payloads and fixed-era decoders

Covers every place this repository hands network-sourced bytes to a `*.deserialize` from a ledger
runtime, and states which era each of those decoders is allowed to be.

## The defect class

A serialized ledger payload carries an envelope tag naming the schema its writer used, and the
schema is era-specific. The deserializer checks that tag before it reads the body, so bytes from the
other era are refused rather than misread — which means a decoder is only correct if the bytes were
written by the era it belongs to.

Four defects of this shape have now been found in this repository, and all four had the same
signature: a call site that reads era-tagged bytes with a **fixed** era's decoder, green unit tests
around it, and a failure that only appears against a chain that has crossed the fork.

| # | Site | Payload | State |
|---|------|---------|-------|
| 1 | keep-state envelope check (`assertRetainedStateEnvelope`), `packages/contracts` | contract state | fixed — dates the envelope, no longer the head |
| 2 | `composeCallTx` operation registry, `packages/protocol` | contract state | fixed — the registry is re-expressed for the composing era |
| 3 | `assemble-call.ts` partitioner | ledger parameters | fixed — the chain's own parameters are carried in as bytes |
| 4 | `parseHexLedgerParameters`, `packages/indexer-public-data-provider` | ledger parameters | fixed here |

The numbering the envelopes use is per payload family and the families collide, so no era can be
derived from a `[vN]` by arithmetic or by analogy with another family's table:

| Payload | Written by ledger v8 | Written by ledger v9 |
|---|---|---|
| contract state | `midnight:contract-state[v6]` | `midnight:contract-state[v8]` |
| ledger parameters | `midnight:ledger-parameters[v5]` | `midnight:ledger-parameters[v8]` |
| zswap chain state | `midnight:zswap-ledger-state[v5]` | `midnight:zswap-ledger-state[v5]` |

The zswap row is the one exception, and it is measured rather than assumed —
`packages/indexer-public-data-provider/src/test/ledger-parameters.test.ts` mints the payload with
both runtimes, empty and carrying retained past roots, and asserts the bytes are identical and that
each era reads the other's. A payload with no era in it needs no era decision.

## Why the unit layer keeps missing it

In all four cases the package's own tests were green while the function could not work. The fixture
and the code agreed with each other and both were wrong about the chain: a test that mints its
inputs with the current era's runtime can only produce current-era bytes, so the decoder is never
handed the payload it will actually meet. Defect 4 was found with a fixture that served *current-era
parameters under a pre-fork block* — a shape no chain produces.

The practical rule: a test that pins era behaviour has to mint with **both** runtimes, and a fixture
that names a block era has to carry the payloads that era writes.

## The audit

Every `*.deserialize` call on a ledger runtime in `packages/*/src` and `testkit-js/*/src`, with the
verdict for each.

### Decoders that are correct because the era is chosen per payload

- `packages/indexer-public-data-provider/src/codec.ts` — `parseHexContractState` dates the envelope
  before decoding and refuses an era it cannot read; `parseHexLedgerParameters` now does the same;
  `decodeVersionedTransaction` dispatches per record to a table with one entry per era.
- `packages/protocol/src/lib/era/envelope.ts` — both eras are named explicitly.

### Decoders that are correct because the arm owns the era

Each of these lives inside an era arm and reads bytes that arm's caller selected. They wrap a
rejected payload in `ComposeOptionError` rather than letting a raw decoder failure escape.

- `packages/protocol/src/lib/v8/{adapt,deploy,prove}.ts`
- `packages/protocol/src/lib/v9/compose.ts`
- `packages/protocol/src/lib/shared/contract-state.ts` — takes the era's module slice as an argument
- `packages/protocol/src/lib/shared/assemble-call.ts` — reads the block's parameters with the era
  that composes the transaction (see the open item below)

### Decoders that are correct because the payload is version-tagged at the seam

The provider seams carry `{ version, tx | txBytes }`, so the era is on the payload rather than
inferred (ADR 0006, ADR 0007).

- `packages/indexer-public-data-provider/src/codec.ts` — `parseHexTransactionV8`
- `testkit-js/testkit-js/src/wallet/wallet-transaction.ts` — both adopt seams

### Decoders that never see chain bytes

- `packages/contracts/src/internal/ledger8-entry.ts` — reads back bytes the current era has just
  composed, inside the current-era arm
- `packages/contracts/src/utils/ledger-utils.ts` — round-trips a live in-memory object through its
  own `serialize()`

### Open, not fixed here

**`NodeClient.contractState()` and `NodeClient.ledgerState()`**
(`testkit-js/testkit-js/src/client/node-client.ts`) decode JSON-RPC responses from the node with the
current era's `ContractState` / `LedgerState`. A pre-fork block, or a contract dormant across the
fork, is undecodable through them. Nothing in this repository calls either — only `.health()` is
used — but both are exported testkit API and appear in `docs/api`, so "unused" is not "unreachable".
Reported rather than changed: adding an era branch to a method with no consumer is work nobody asked
for, and deleting them is a breaking change to the testkit's public surface.

**The fork window between the head read and the state read.** A retained-era operation resolves the
head era first (`acquireLedger8Runtime`) and reads the contract state after it
(`readLedger8Snapshot`), and the state read is what brings back the block's ledger parameters. The
fork can be enacted between the two: the head is read as `v8`, the state read then lands on a
post-fork block, and its `[v8]`-tagged parameters are handed to the **v8** composer, which refuses
them as `ComposeOptionError('v8', 'ledgerParameters')`. The opposite skew — a `v9` head with
pre-fork parameters — is excluded by that same ordering.

The refusal is loud and fails fast, but it is not *diagnosed*: `handleSubmitRejection` recognises
only submission rejections (`LEDGER8_SEAM_FAILED`), so a caller sees an error naming the parameter
bytes rather than one naming the fork window they just crossed. It belongs with the in-flight
fork-crossing work (QA-3), because a unit test cannot show that the diagnosis is the right one —
only a run across a real enactment can.

**`DEFAULT_DUST_OPTIONS.ledgerParams`** (`testkit-js/testkit-js/src/wallet/wallet-factory.ts`) is
built from `LedgerParameters.initialParameters()`. That is the ledger's *initial* cost model, not
the one any running chain uses, so the wallet's fee estimate is made against a model the chain does
not run. Testkit only, and not on the path of any defect above.

## Related documents

- [The fork-crossing e2e environment](./fork-e2e-environment.md)
- `packages/protocol/docs/shared-table-discipline.md` — why each tag table is a frozen,
  null-prototype record and why it must not be copied
- `packages/protocol/docs/fail-closed-decoding.md` — what a decode guarantees once the era is settled
- `packages/contracts/docs/keep-state-pipeline.md` — the retained-era read path

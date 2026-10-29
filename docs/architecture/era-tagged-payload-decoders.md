# Era-tagged payloads and fixed-era decoders

Covers every place this repository hands network-sourced bytes to a `*.deserialize` from a ledger
runtime, and states which era each of those decoders is allowed to be.

## The rule every public value follows

`era: 'v8' | 'v9'` on a public value is the ledger era that WROTE it, read from the payload's
envelope; `protocolVersion` is the era of the block that dated the read. A value read from the
network — a contract state, ledger parameters, a zswap chain state — is a `LedgerState`: the bytes
and their `era`, the same shape in both eras, decoded by the caller (ADR 0020). A
finalized-transaction record is the `FinalizedTxRead` union: both of its variants carry a
`FinalizedTx` handle of the record's era, `record.tx.era === record.era` (ADR 0019). A consumer
narrows it with `switch (record.era)` closed by `assertNever`. A `contracts` pipeline result also carries `era`, naming the pipeline that produced it;
its `public.era` names the ledger that recorded the transaction.

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
| 4 | `parseHexLedgerParameters`, `packages/indexer-public-data-provider` | ledger parameters | fixed, then removed: the read no longer decodes (ADR 0020) |

The numbering the envelopes use is per payload family and the families collide, so no era can be
derived from a `[vN]` by arithmetic or by analogy with another family's table:

| Payload | Written by ledger v8 | Written by ledger v9 |
|---|---|---|
| contract state | `midnight:contract-state[v6]` | `midnight:contract-state[v8]` |
| ledger parameters | `midnight:ledger-parameters[v5]` | `midnight:ledger-parameters[v8]` |
| zswap chain state | `midnight:zswap-ledger-state[v5]` | `midnight:zswap-ledger-state[v5]` |

Every row above is measured against bytes minted by both real runtimes, never assumed from another
family's numbering. The rows live in one table, `LEDGER_STATE_TAGS` in
`packages/protocol/src/lib/shared/state-tags.ts`, which `LedgerState.fromBytes` in `types` and the
`ledgerVersionOf*` readers in `utils` both read. It is pinned by
`packages/protocol/src/test/state-tags.test.ts`, which mints every kind with both runtimes and
asserts the literal tag each one writes.

The zswap row is the one exception in kind: the same test mints it empty and carrying retained past
roots, and asserts the bytes are identical and that each era reads the other's. A payload with no
era in it needs no era decision.

## Why the unit layer keeps missing it

In all four cases the package's own tests were green while the function could not work. The fixture
and the code agreed with each other and both were wrong about the chain: a test that mints its
inputs with the current era's runtime can only produce current-era bytes, so the decoder is never
handed the payload it will actually meet. Defect 4 was found with a fixture that served *current-era
parameters under a pre-fork block* — a shape no chain produces.

The practical rule: a test that pins era behaviour has to mint with **both** runtimes, and a fixture
that names a block era has to carry the payloads that era writes.

## The audit

Every era-fixed ledger decode in `packages/*/src` and `testkit-js/*/src`, with the verdict for each —
whether it calls a runtime's `*.deserialize` directly or reaches it through the
`@midnight-ntwrk/midnight-js-utils` typed wrappers.

Re-run the sweep this was built from with:

```sh
grep -rnE '\.deserialize[<(]|deserialize(Ledger|Compact|Zswap)' --include='*.ts' packages/*/src testkit-js/*/src
```

### Decoders that are correct because the era is chosen per payload

- `packages/indexer-public-data-provider/src/codec.ts` — `toContractStateRead` and
  `toPublicStatesRead` decode nothing: they read the version tag of each payload and wrap the bytes
  in a `LedgerState` of that version. The caller decodes with its own runtime (ADR 0020).
  `decodeRecordTransaction` dispatches per record to a table with one entry per era.
- `packages/types/src/ledger-state.ts` — `LedgerState.deserialize` calls only the decoder for the
  value's own version.
- `packages/contracts/src/internal/era.ts` — `decodeLedger9ContractState` and
  `decodeLedger9PublicStates` decode a read with the framework's copy, only to build a transaction,
  and refuse a v8 state with `EraMismatchError` (reason `'ledger8-contract-state-unsupported'`) before any decode.
- `packages/protocol/src/lib/era/envelope.ts` — both eras are named explicitly.

### Decoders that are correct because the code path owns the era

Each of these lives inside one era's code path and reads bytes that path's caller selected. Most classify a
rejected payload rather than letting a raw decoder failure escape, but they do not all classify it
the same way, and one does not classify it at all:

- `packages/protocol/src/lib/v8/{adapt,deploy}.ts`, `packages/protocol/src/lib/v9/compose.ts` —
  wrap in `ComposeOptionError`
- `packages/protocol/src/lib/shared/assemble-call.ts` — wraps in `ComposeOptionError`; reads the
  block's parameters with the era that composes the transaction (see the open items below)
- `packages/protocol/src/lib/shared/contract-state.ts` — wraps a `deserialize` failure in
  `StateDecodeFailedError` and any later failure in `StateInconsistentError`, not
  `ComposeOptionError`; takes the era's module slice as an argument
- `packages/protocol/src/lib/shared/ledger-transaction.ts` — `deserializeTransactionAtStage`. The
  era and the stage come from the caller, never from the bytes. Bytes without a transaction tag, and
  bytes the era's runtime refuses at that stage (`undecodable`, the refusal on `cause`), fail as
  `PayloadNotATransactionError`. `proveLedger8Transaction` no longer decodes: it takes a live v8
  object and only proves it.

### Decoders that are correct because the era comes from the request

The provider methods carry transaction handles, and each handle carries its era, so a decoder at
a boundary is chosen from the era of the request rather than inferred from the bytes (ADR 0019).

- `packages/indexer-public-data-provider/src/codec.ts` — `parseHexTransaction(era, …)`, chosen by
  the record's own era
- `testkit-js/testkit-js/src/wallet/wallet-transaction.ts` — `adoptInWallet` and
  `finalizedFromWallet`, chosen by the era of the handle the wallet provider received
- `packages/dapp-connector-proof-provider/src/dapp-connector-wallet-providers.ts` —
  `deserializeTransactionAtStage(era, 'Finalized', …)`, chosen by the era of the handle passed to
  `balanceTx`

### Decoders that never see chain bytes

- `packages/contracts/src/internal/ledger8-entry.ts` — reads back bytes the current era has just
  composed, inside the current-era path
- `packages/contracts/src/internal/utils/ledger-utils.ts` — round-trips a live in-memory object through its
  own `serialize()`, via the `utils` wrappers below

### The typed wrappers themselves

`packages/utils/src/deserialization/typed-wrappers.ts` holds four fixed-era decoders
(`deserializeLedgerContractState`, `deserializeCompactContractState`, `deserializeZswapChainState`,
`deserializeLedgerParameters`) and one that takes the era as an argument,
`deserializeLedgerTransaction(era, bytes, ctx)`. The four are era-fixed by construction
and deliberately so: each is the *current* era's decoder plus a `caller` marker, and every verdict
above about a call site is a verdict about which wrapper that site picks and what it checks first.
They are correct as a layer — a wrapper cannot date bytes it is not told the era of — so the
obligation sits with the callers, which is what the rest of this table records.

### Open, not fixed here

**`NodeClient.contractState()` and `NodeClient.ledgerState()`**
(`testkit-js/testkit-js/src/client/node-client.ts`) decode JSON-RPC responses from the node with the
current era's `ContractState` / `LedgerState`. A pre-fork block is undecodable through them. Nothing in this repository calls either — only `.health()` is
used — but both are exported testkit API and appear in `docs/api`, so "unused" is not "unreachable".
Reported rather than changed: adding an era branch to a method with no consumer is work nobody asked
for, and deleting them is a breaking change to the testkit's public surface.

Both also carry the silent-truncation defect the hex guards elsewhere in this document exist to
prevent, independently of the era question: `Buffer.from(result, 'hex')` with no `isHex` guard —
`result` is only checked for being a non-empty string — and `ledgerStateBlob` assumes a 4-character
prefix with a bare `result.slice(4)`, so a response without it silently loses two real bytes. Those
are two lines to fix and do not touch the era branch; they are listed here so the next reader of
these methods sees all of it.

**`DAppConnectorWalletAdapter`** (`testkit-js/testkit-js/src/wallet/dapp-connector-wallet-adapter.ts`)
decodes nothing with a ledger itself: at three points (`balanceAndProveTransaction`, and both
submit paths) it hands the DApp-supplied hex to the wallet SDK as bytes, with
`wallet.adoptTransaction(fromHex(tx), stage)`, and the wallet picks the era. Unlike its sibling
`wallet/wallet-transaction.ts`, these do not receive a transaction handle — the adapter
implements the connector API, whose shape is fixed by the connector rather than by us, so the era
cannot be carried with the transaction without changing that API. Testkit only, and the bytes originate
from a wallet this process just handed a transaction to, so the era is in practice the composing
era. Recorded rather than changed because the fix is a method change to a third-party-facing
interface, not a local guard.

**The fork window between the head read and the state read.** A retained-era operation resolves the
head era first (`acquireLedger8Runtime`) and reads the contract state after it
(`readLedger8Snapshot`), and the state read is what brings back the block's ledger parameters. The
fork can be enacted between the two: the head is read as `v8`, the state read then lands on a
post-fork block, and its `[v8]`-tagged parameters are handed to the **v8** composer, which refuses
them as `ComposeOptionError('v8', 'ledgerParameters')`. The opposite skew — a `v9` head with
pre-fork parameters — is excluded by that same ordering.

The refusal is loud and fails fast, but it is not *diagnosed*: `handleSubmitRejection` recognises
only submission rejections (`PROVIDER_FAILED`), so a caller sees an error naming the parameter
bytes rather than one naming the fork window they just crossed. It belongs with the in-flight
fork-crossing work, because a unit test cannot show that the diagnosis is the right one — only a run
across a real enactment can.

**`DEFAULT_DUST_OPTIONS.ledgerParams`** (`testkit-js/testkit-js/src/wallet/wallet-factory.ts`) is
built from `LedgerParameters.initialParameters()`. That is the ledger's *initial* cost model, not
the one any running chain uses, so the wallet's fee estimate is made against a model the chain does
not run. Testkit only, and not on the path of any defect above.

## Related documents

- [The fork-crossing e2e environment](./fork-e2e-environment.md)
- `packages/protocol/docs/shared-table-discipline.md` — why a table indexed by a value must not
  resolve an unexpected key through `Object.prototype`, and why a tag table must not be copied.
  `LEDGER_STATE_TAGS` satisfies that by being keyed by kind and ERA, and searched rather than keyed
  by tag and indexed, which also makes a new `LedgerVersion` with no tag a build failure.
- `packages/protocol/docs/fail-closed-decoding.md` — what a decode guarantees once the era is settled
- `packages/contracts/docs/keep-state-pipeline.md` — the retained-era read path

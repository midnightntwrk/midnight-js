---
title: VersionTaggedPayloads
---

# Why transactions are handles, on-chain state is bytes, and what the era tag does not promise

During the ledger-fork window this framework talks to two ledger runtimes at
once. They are separate WASM instances, so an object built by one cannot be
handed to the other — not "should not", cannot: the receiving instance does not
recognise the object. The same is true of two installs of ONE ledger package:
`@midnight-ntwrk/ledger-v8` and `@midnightntwrk/ledger-v8` are two WASM
instances, and a type checker cannot tell their objects apart.

This package handles that fact in three ways:

- A transaction passed to a provider method is a **handle**
  (`UnprovenTx`, `UnboundTx`, `FinalizedTx`). The handle carries its era as data
  and checks the WASM instance when it is made.
- A value the ledger wrote and the read side returns — a contract state, ledger
  parameters, a zswap chain state — is a **`LedgerState`**: the bytes, plus the
  era of the ledger that wrote them. The caller decodes it with its own
  runtime.
- A finalized-transaction record (`FinalizedTxRead`) carries an `era`
  discriminant.

All three name the era of the ledger that wrote them `era`.

Two families of names, and the word that tells them apart. A `*Tx` name with no
`Data` is a transaction handle (`UnprovenTx`, `UnboundTx`, `FinalizedTx`). A
`*TxData` name is data about a transaction, kept from 4.x: the record a read
method returns (`FinalizedTxData`, `Ledger8FinalizedTxData`,
`FinalizedTxRead`). Its `tx` field is a `FinalizedTx`.

What each provider declares about the eras it serves is covered in
[ProviderEraDeclarations](./provider-era-declarations.md). The
decisions this implements are
`docs/adr/0006-version-tagged-payloads-at-provider-seams.md`,
`docs/adr/0019-carry-transactions-as-opaque-era-carrying-handles.md` and
`docs/adr/0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md`.

## A transaction crosses a provider method as a handle

`LedgerTransaction<S>` holds one live ledger transaction, its era (`'v8'` or
`'v9'`) and its stage `S` (`'Unproven'`, `'Unbound'` or `'Finalized'`). The
ledger object sits in a private field. There is one way in and one way out:

- `LedgerTransaction.seal(era, stage, tx)` makes a handle. Before it does, it
  checks that `tx` is an object of the ledger copy this framework loaded for
  `era`. An object of another copy is refused with
  `ForeignLedgerTransactionError`, reason `foreign-instance`. A v8 object
  sealed before the framework loaded its v8 ledger is refused with reason
  `ledger8-not-loaded`: until `loadLedger8Protocol()` has resolved, there is no
  framework v8 class to compare with.
- `LedgerTransaction.unwrap(handle, era)` reads the object back. A handle of
  another era is refused with `TransactionEraMismatchError`.

The era is data on the handle, so the handle has the same shape in every era.
When a new ledger becomes current, a ledger 9 handle does not change shape.

The stage is part of the type, so passing an unproven handle to
`MidnightProvider.submitTx` is a compile error. At run time `seal` reads the
stage from the object's serialized tag, because a ledger uses one class for all
three stages, and refuses an object at another stage with
`InvalidTransactionHandleError`, reason `stage-mismatch`. The provider methods
check the handle they receive with `LedgerTransaction.require`, and refuse a
handle at the wrong stage with reason `wrong-stage`.

When a provider hands a transaction to another ledger copy (a wallet SDK, a
DApp Connector wallet), it serializes the transaction on the way out and decodes the
answer into the framework's copy on the way in, with
`deserializeTransactionAtStage` from
`@midnight-ntwrk/midnight-js-protocol/transaction`. The era for that decode
comes from the request, never from the bytes.

## On-chain state is bytes, decoded by the caller

`LedgerState<K, E>` holds the bytes the ledger wrote, a `kind`
(`'ContractState'`, `'LedgerParameters'` or `'ZswapChainState'`) and an `era`
(`'v8'` or `'v9'`), like `LedgerTransaction`. The reads return it inside a
record: `ContractStateAndParametersRead` from `queryContractState`,
`ContractStateRead` from `watchForContractState`, `queryDeployContractState`
and `contractStateObservable`, and `PublicStatesRead` from
`queryZSwapAndContractState`.

- `LedgerState.fromBytes(era, kind, bytes)` makes one, and nothing else can. It
  checks that the bytes start with the tag the ledger of `era` writes for `kind`
  (`LEDGER_STATE_TAGS` in `@midnight-ntwrk/midnight-js-protocol/version`), and
  refuses other bytes with `InvalidLedgerStateError`. A zswap chain state has the
  same tag in v8 and v9, so the check accepts it under either era.
- `LedgerState.isLedgerState(value)` tells a `LedgerState` of this copy of the
  package from a look-alike object. A `LedgerState` made by a second installed
  copy of this package gives `false`. The `contracts` package does not refuse
  such a state: it rebuilds it from its bytes with `fromBytes`, which checks the
  tag again.
- `state.serialize()` returns a copy of the bytes. `fromBytes` copies too, so a
  Node `Buffer` passed in shares no memory with the state.
- `state.deserialize({ v9: ContractState })` decodes with the decoder for the
  state's own era, and only that one. Pass the class from the runtime your
  contract was compiled against: a state decoded by another copy is refused by
  your contract's `ledger()` with `expected instance of ChargedState`. A missing
  decoder is refused with `LedgerStateDecoderMissingError`, whose message names
  the class to import. A decoder that throws is reported as
  `LedgerStateDecodeFailedError`, with its error as `cause`, unless the error
  is already a `MidnightJsError`: that one is rethrown unchanged. A call with no
  decoder for any era the state can be does not compile.
- The bytes are a private field, so `structuredClone`, `postMessage` and JSON
  drop them. Send `serialize()` and `era`, and rebuild with `fromBytes`.

The shape is the same in every era, so the next fork changes no read type.

A finalized-transaction record names its era `era` too, and its `tx` is a
`FinalizedTx` of that same era: `record.tx.era === record.era`. Read it with
`LedgerTransaction.unwrap(record.tx, record.era)`.

## Three things the tag does not establish

**It does not validate the body.** `LedgerState.fromBytes` checks the tag at
the front of the bytes, nothing after it. A decoder that refuses the body is
reporting a real disagreement, not a bug in the reader.

**It is only as true as the provider that set it.** See the next section.

**On a transaction record, the type cannot check it.** `record.era` is
derived from the block by the provider; nothing in this package re-derives it.

## Where `era` comes from, and who is obliged to get it right

On every value, `era` is the ledger era that WROTE it.

- A finalized-transaction record is written in its own block, so its `era`
  is derived from that block's `protocolVersion`, resolved the same way the
  `read`-path resolver in `@midnight-ntwrk/midnight-js-protocol` resolves it.
- A contract state can be older than the block that dates the read: a record
  keeps the encoding it was written in. Its `era` (`contractState.era`) is read
  from the state's own version tag. `protocolVersion` dates the block and only
  bounds that tag from above.

The derivation is never asserted in this package. The obligation sits with
implementations instead: a provider and its mocks must set `era` at exactly
ONE construction point, by the rule above, and never independently.

The providers in this framework do that. They refuse a record from an era they
cannot decode, and refuse state bytes whose version tag they cannot place — so
from them, `era` is a statement about the value rather than an assumption. **A third-party `PublicDataProvider` is not
obliged to do the same.** Code reading a record from an arbitrary provider should
treat the tag as a claim.

## Narrowing is not optional

A provider that decodes per era returns the v8 variant as an ordinary value for
any record whose `protocolVersion` places it in that era. It is not an error
path, and it is not rare.

So narrow a `FinalizedTxRead` on `era` when your code treats the
eras differently, and close the `switch` with `assertNever` from
`@midnight-ntwrk/midnight-js-utils`, so a further era becomes a compile error
rather than a fall-through. To read the transaction itself, pass
`record.era` to `LedgerTransaction.unwrap`.

## Ledger parameters travel with the state

`ContractStateAndParametersRead.ledgerParameters` is on the state record rather
than fetched separately, and that placement is the point.

They are needed to build a transaction against this state. They come from the
block that dates the read: they are dynamic — prices adjust per block — and they
are era-tagged, `ledger-parameters[v5]` before the fork and `[v8]` after it. On a
read pinned to a block, the state and the parameters come from that one block. On
an unpinned read, that block is looked up separately from the state, so near the
fork it can be a block other than the one the state was read at.

Substituting the ledger's own `initialParameters()` is a cost model the chain
does not use. That is wrong on any chain that has been running, not only across a
fork — see `packages/contracts/docs/error-taxonomy.md` for what it cost before a
refusal existed.

They are a `LedgerState` for the same reason the contract state is: only the
era that wrote them can read them, and the caller holds the runtime.

The member is required on `ContractStateAndParametersRead` and on
`PublicStatesRead`. A provider written in JavaScript can still leave it out, so
the framework checks it where it needs the parameters. Building a v9 call reads
`queryZSwapAndContractState` and refuses a missing one with
`PublicStatesEraMismatchError`; the v8 pipeline reads `queryContractState` and
refuses it with `LedgerParametersUnservedError`. Both refuse parameters of
another era than the call with `PublicStatesEraMismatchError`, and parameters in
a shape that names no known era with `UnrecognisedEraTagError`.

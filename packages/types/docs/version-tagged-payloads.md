---
title: VersionTaggedPayloads
---

# Why transactions are handles, read results carry an era tag, and what the tag does not promise

During the ledger-fork window this framework talks to two ledger runtimes at
once. They are separate WASM instances, so an object built by one cannot be
handed to the other — not "should not", cannot: the receiving instance does not
recognise the object. The same is true of two installs of ONE ledger package:
`@midnight-ntwrk/ledger-v8` and `@midnightntwrk/ledger-v8` are two WASM
instances, and a type checker cannot tell their objects apart.

This package handles that fact in two ways:

- A transaction passed to a provider method is a **handle**
  (`UnprovenTx`, `UnboundTx`, `FinalizedTx`). The handle carries its era as data
  and checks the WASM instance when it is made.
- A value the read side returns (`VersionedFinalizedTxData`,
  `VersionedContractState`, `VersionedPublicStates`) carries a `version`
  discriminant.

Two families of names, and the word that tells them apart. A `*Tx` name with no
`Data` is a transaction handle (`UnprovenTx`, `UnboundTx`, `FinalizedTx`). A
`*TxData` name is data about a transaction, kept from 4.x: the record a read
method returns (`FinalizedTxData`, `Ledger8FinalizedTxData`,
`VersionedFinalizedTxData`). Its `tx` field is a `FinalizedTx`.

What each provider declares about the eras it serves is covered in
[ProviderEraDeclarations](./provider-era-declarations.md). The
decisions this implements are
`docs/adr/0006-version-tagged-payloads-at-provider-seams.md` and
`docs/adr/0019-carry-transactions-as-opaque-era-carrying-handles.md`.

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

The stage is part of the type, so passing an unproven handle to `submitTx` is a
compile error. `seal` cannot check the stage at run time: a ledger uses one
class for all three stages. The provider methods check `handle.stage` instead,
and refuse a handle at the wrong stage with `InvalidTransactionHandleError`,
reason `wrong-stage`.

When a provider hands a transaction to another ledger copy (a proof server, a
wallet SDK), it serializes the transaction on the way out and decodes the
answer into the framework's copy on the way in, with
`deserializeTransactionAtStage` from
`@midnight-ntwrk/midnight-js-protocol/transaction`. The era for that decode
comes from the request, never from the bytes.

## A read result carries `version`

`RawContractState` reads the same way as before. A contract's state comes back
as serialized bytes still in their envelope, with nothing deserialized, plus the
era that wrote them, read off that envelope. That lets a caller pick a runtime
BEFORE it deserializes anything, instead of guessing and failing deep inside a
decoder.

A finalized-transaction record keeps `version` too, and its `tx` is a
`FinalizedTx` of that same era: `record.tx.era === record.version`. Read it with
`LedgerTransaction.unwrap(record.tx, record.version)`.

## Three things the tag does not establish

**It does not validate stored bytes.** Any `Uint8Array` satisfies `stateBytes`,
and nothing in this package checks the tag prefix of a contract state.

**It is only as true as the provider that set it.** See the next section.

**On a read, the type cannot check it.** Nothing in this package reads the
envelope inside `raw`; that is the provider's job. A decoder that refuses those
bytes is reporting a real disagreement, not a bug in the reader.

## Where `version` comes from, and who is obliged to get it right

On every value, `version` is the ledger era that WROTE it.

- A finalized-transaction record is written in its own block, so its `version`
  is derived from that block's `protocolVersion`, resolved the same way the
  `read`-path resolver in `@midnight-ntwrk/midnight-js-protocol` resolves it.
- A contract state can be older than the block that dates the read: a record
  keeps the encoding it was written in. Its `version` is read from the state's
  own envelope. `protocolVersion` dates the block and only bounds the envelope
  from above.

The derivation is never asserted in this package. The obligation sits with
implementations instead: a provider and its mocks must set `version` at exactly
ONE construction point, by the rule above, and never independently.

The providers in this framework do that, and throw rather than mislabel a record
from an era they cannot decode — so from them, `version` is a statement about the
record rather than an assumption. **A third-party `PublicDataProvider` is not
obliged to do the same.** Code reading a record from an arbitrary provider should
treat the tag as a claim.

## Narrowing is not optional

A provider that decodes per era returns the v8 variant as an ordinary value for
any record whose `protocolVersion` places it in that era. It is not an error
path, and it is not rare.

So narrow a `VersionedFinalizedTxData` on `version` when your code treats the
eras differently, and close the `switch` with `assertNever` from
`@midnight-ntwrk/midnight-js-utils`, so a further era becomes a compile error
rather than a fall-through. To read the transaction itself, pass
`record.version` to `LedgerTransaction.unwrap`.

## Ledger parameters travel with the state

`RawContractState.ledgerParameters` is on the state record rather than fetched
separately, and that placement is the point.

They are needed to build a transaction against this state, and they must come
from the SAME block: they are dynamic — prices adjust per block — and they are
era-tagged, `ledger-parameters[v5]` before the fork and `[v8]` after it. Reading
them separately would let the two answers come from different blocks.

Substituting the ledger's own `initialParameters()` is a cost model the chain
does not use. That is wrong on any chain that has been running, not only across a
fork — see `packages/contracts/docs/error-taxonomy.md` for what it cost before a
refusal existed.

They are bytes rather than a decoded object for the same reason `raw` is: only
the era that wrote them can read them, and this record is deliberately
era-agnostic.

The member is optional because a provider that cannot serve them is still a
usable provider. A consumer that needs them has to say what it does without them.

---
title: VersionTaggedPayloads
---

# Why payloads carry an era tag, and what the tag does not promise

During the ledger-fork window this framework talks to two ledger runtimes at
once. They are separate WASM instances, so an object built by one cannot be
handed to the other — not "should not", cannot: the receiving instance does not
recognise the handle.

Everything in this package that carries a `version` discriminant follows from
that one fact. This document records what the tag lets a caller do, and — more
importantly — the three things it deliberately does not establish.

The seams themselves are [SeamEraDeclarations](./seam-era-declarations.md). The
decision this implements is
`docs/adr/0006-version-tagged-payloads-at-provider-seams.md`.

## The retained arm crosses as bytes, the current arm as an object

`V8TxBytes` is the retained arm of every transaction payload crossing a provider
seam — `proveTx`, `balanceTx`, `submitTx` — in both directions. It carries
serialized, tag-prefixed bytes rather than a live ledger object, because a live
object cannot survive the crossing.

The `version` discriminant says which runtime produced those bytes. It is the
only thing that does: nothing downstream can work it out from the bytes alone
without first choosing a decoder, which is the very question the tag answers.

`RawContractState` reads the same way on the read path. A contract's state comes
back as serialized bytes still in their envelope, with nothing deserialized, plus
the era the network dated them to. That lets a caller pick a runtime BEFORE it
deserializes anything, instead of guessing and failing deep inside a decoder.

## Three things the tag does not establish

**It does not validate the bytes.** Any `Uint8Array` satisfies `txBytes`, and
nothing in this package checks for the tag prefix.

**It does not say which pipeline stage a transaction has reached.** The retained
arm is identical for all three seams. On that path, stage is the caller's
responsibility — the type carries no statement about it.

**On a read, it does not promise the bytes agree with it.** Nothing here compares
`version` against the envelope inside `raw`. The field is the NETWORK'S DATING of
the record, not a guarantee about its contents. A decoder that refuses those
bytes is reporting a real disagreement, not a bug in the reader.

## Where `version` comes from, and who is obliged to get it right

`version` is derived from `protocolVersion`, resolved the same way the `read`-path
resolver in `@midnight-ntwrk/midnight-js-protocol` resolves it. On every value of
these types the two fields therefore agree.

The derivation is never asserted in this package, because `types` stays
declarations-only. The obligation sits with implementations instead: a provider
and its mocks must set `version` at exactly ONE construction point, from
`protocolVersion`, and never independently.

The providers in this framework do that, and throw rather than mislabel a record
from an era they cannot decode — so from them, `version` is a statement about the
record rather than an assumption. **A third-party `PublicDataProvider` is not
obliged to do the same.** Code reading a record from an arbitrary provider should
treat the tag as a claim.

## Narrowing is not optional

A provider that decodes per era returns the retained arm as an ordinary value for
any record whose `protocolVersion` places it in that era. It is not an error
path, and it is not rare.

So a `VersionedFinalizedTxData` must be narrowed on `version` before `tx` is
touched. Close the `switch` with `assertNever` from
`@midnight-ntwrk/midnight-js-utils`, so a further era becomes a compile error
rather than a fall-through.

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

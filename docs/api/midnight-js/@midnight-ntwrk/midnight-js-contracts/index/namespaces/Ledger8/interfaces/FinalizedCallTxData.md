[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / FinalizedCallTxData

# Interface: FinalizedCallTxData\<C, K\>

What a retained-era call transaction resolves with once finalized.

The SAME two-level structure the current era answers with -- `public` for the
non-sensitive half, `private` for the confidential one -- so a caller reads
`private.result`, `public.txId` and `public.status` identically in both eras.
Both halves are built from the shared bases in `midnight-js-types`, so the
members that differ are only the ones each era adds: see
[Ledger8CallResultPublic](CallResultPublic.md) and [Ledger8CallResultPrivate](CallResultPrivate.md) for what
they are, what stands in for them, and why.

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

### K

`K` *extends* [`CircuitId`](../type-aliases/CircuitId.md)\<`C`\>

## Properties

### calls

> `readonly` **calls**: readonly [`ContractCall`](ContractCall.md)\<`DownConvertedState`\>[]

See [Ledger8UnsubmittedCallTxData.calls](UnsubmittedCallTxData.md#calls).

***

### circuitId

> `readonly` **circuitId**: `K`

***

### era

> `readonly` **era**: `"ledger8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

***

### private

> `readonly` **private**: [`CallResultPrivate`](CallResultPrivate.md)\<`C`, `K`\>

***

### public

> `readonly` **public**: [`FinalizedCallTxPublicData`](../type-aliases/FinalizedCallTxPublicData.md)

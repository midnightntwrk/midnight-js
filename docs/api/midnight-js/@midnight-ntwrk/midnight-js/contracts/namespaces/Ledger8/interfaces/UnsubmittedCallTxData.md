[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / UnsubmittedCallTxData

# Interface: UnsubmittedCallTxData\<C, K\>

The execution data of a retained-era call, before the chain has recorded it.

The same two halves [Ledger8FinalizedCallTxData](FinalizedCallTxData.md) carries, minus the
finalized record — which is the one thing a submission that does not wait
for finalization cannot answer with.

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

### K

`K` *extends* [`CircuitId`](../type-aliases/CircuitId.md)\<`C`\>

## Properties

### calls

> `readonly` **calls**: readonly [`ContractCall`](ContractCall.md)\<`DownConvertedState`\>[]

Proof data for every contract call this circuit made, as the current era's
`CallResult.calls` carries. Always exactly ONE entry, the root call: a
pre-fork contract cannot make a cross-contract call.

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

> `readonly` **public**: [`CallResultPublic`](CallResultPublic.md)

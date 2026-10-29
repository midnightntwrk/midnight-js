[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8UnsubmittedCallTxData

# Interface: Ledger8UnsubmittedCallTxData\<C, K\>

The execution data of a retained-era call, before the chain has recorded it.

The same two halves [Ledger8FinalizedCallTxData](Ledger8FinalizedCallTxData.md) carries, minus the
finalized record — which is the one thing a submission that does not wait
for finalization cannot answer with.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

### K

`K` *extends* [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>

## Properties

### calls

> `readonly` **calls**: readonly [`Ledger8ContractCall`](Ledger8ContractCall.md)\<`StateValue`\>[]

Proof data for every contract call this circuit made, as the current era's
`CallResult.calls` carries. Always exactly ONE entry, the root call: a
pre-fork contract cannot make a cross-contract call.

***

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

***

### private

> `readonly` **private**: [`Ledger8CallResultPrivate`](Ledger8CallResultPrivate.md)\<`C`, `K`\>

***

### public

> `readonly` **public**: [`Ledger8CallResultPublic`](Ledger8CallResultPublic.md)

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / FoundContract

# Interface: FoundContract\<C\>

A retained-era contract found on the blockchain.

Carries a [Ledger8CircuitCallTxInterface](../type-aliases/CircuitCallTxInterface.md) for the same reason the
current era's `FoundContract` carries one: a caller that has just supplied
the contract and its address should not have to supply them again to call it.

The maintenance interfaces the current era's `FoundContract` also carries are
NOT here: the retained era has no governance arm at all, so there is nothing
for them to reach.

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

## Properties

### callTx

> `readonly` **callTx**: [`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

***

### compiledContract

> `readonly` **compiledContract**: `C`

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### deployTxData

> `readonly` **deployTxData**: [`VersionedFinalizedTxData`](../../../../types/type-aliases/VersionedFinalizedTxData.md)

***

### era

> `readonly` **era**: `"ledger8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

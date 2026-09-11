[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / SubmittedCallTx

# Interface: SubmittedCallTx\<C, K\>

What a retained-era call transaction resolves with when submitted without
waiting for finalization.

Carries the execution data on `callTxData`, as the current era's
SubmittedCallTx does, and names the same members it does. The next
private state is reachable at `callTxData.private.nextPrivateState`, the one
path both eras publish it on.

## Extends

- [`SubmittedCallTxBase`](../../../../../midnight-js/types/interfaces/SubmittedCallTxBase.md)\<[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)\<`C`, `K`\>\>

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

### K

`K` *extends* [`CircuitId`](../type-aliases/CircuitId.md)\<`C`\>

## Properties

### callTxData

> `readonly` **callTxData**: [`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)

The execution data of the call that was submitted.

#### Remarks

**Privacy-sensitive.** Carries the call's private half.

#### Inherited from

[`SubmittedCallTxBase`](../../../../../midnight-js/types/interfaces/SubmittedCallTxBase.md).[`callTxData`](../../../../../midnight-js/types/interfaces/SubmittedCallTxBase.md#calltxdata-1)

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

### txId

> `readonly` **txId**: `string`

The transaction ID returned from submission.

#### Inherited from

[`SubmittedCallTxBase`](../../../../../midnight-js/types/interfaces/SubmittedCallTxBase.md).[`txId`](../../../../../midnight-js/types/interfaces/SubmittedCallTxBase.md#txid)

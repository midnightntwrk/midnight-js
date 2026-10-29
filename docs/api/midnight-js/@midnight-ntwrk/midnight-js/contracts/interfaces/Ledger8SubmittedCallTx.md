[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8SubmittedCallTx

# Interface: Ledger8SubmittedCallTx\<C, K\>

What a retained-era call transaction resolves with when submitted without
waiting for finalization.

Carries the execution data on `callTxData`, as the current era's
[Ledger9SubmittedCallTx](Ledger9SubmittedCallTx.md) does, and names the same members it does. The next
private state is reachable at `callTxData.private.nextPrivateState`, the one
path both eras publish it on.

## Extends

- [`SubmittedCallTxBase`](../../types/interfaces/SubmittedCallTxBase.md)\<[`Ledger8UnsubmittedCallTxData`](Ledger8UnsubmittedCallTxData.md)\<`C`, `K`\>\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

### K

`K` *extends* [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>

## Properties

### callTxData

> `readonly` **callTxData**: [`Ledger8UnsubmittedCallTxData`](Ledger8UnsubmittedCallTxData.md)

The execution data of the call that was submitted.

#### Remarks

**Privacy-sensitive.** Carries the call's private half.

#### Inherited from

[`SubmittedCallTxBase`](../../types/interfaces/SubmittedCallTxBase.md).[`callTxData`](../../types/interfaces/SubmittedCallTxBase.md#calltxdata-1)

***

### circuitId

> `readonly` **circuitId**: `K`

***

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

***

### txId

> `readonly` **txId**: `string`

The transaction ID returned from submission.

#### Inherited from

[`Ledger9SubmittedCallTx`](Ledger9SubmittedCallTx.md).[`txId`](Ledger9SubmittedCallTx.md#txid)

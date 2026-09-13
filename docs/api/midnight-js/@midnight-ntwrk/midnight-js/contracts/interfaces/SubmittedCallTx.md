[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / SubmittedCallTx

# Interface: SubmittedCallTx\<C, PCK\>

Data returned from an asynchronous call transaction submission.
Contains the transaction ID and call transaction data without waiting for finalization.

## Remarks

**Privacy-sensitive type.** The `callTxData` field carries
[UnsubmittedCallTxData](UnsubmittedCallTxData.md) and transitively the `UnprovenTransaction`
and the call's private state. Treat as confidential when logging,
serializing, or transmitting — read only `txId` or destructure specific
non-sensitive fields rather than spreading or stringifying the whole
object.

## Extends

- [`SubmittedCallTxBase`](../../types/interfaces/SubmittedCallTxBase.md)\<[`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract$1.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### callTxData

> `readonly` **callTxData**: [`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)

The execution data of the call that was submitted.

#### Remarks

**Privacy-sensitive.** Carries the call's private half.

#### Inherited from

[`SubmittedCallTxBase`](../../types/interfaces/SubmittedCallTxBase.md).[`callTxData`](../../types/interfaces/SubmittedCallTxBase.md#calltxdata-1)

***

### circuitId

> `readonly` **circuitId**: `PCK`

See [FinalizedCallTxData.circuitId](FinalizedCallTxData.md#circuitid).

***

### era

> `readonly` **era**: `"ledger9"`

The pipeline that produced this result: always the current era here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

***

### txId

> `readonly` **txId**: `string`

The transaction ID returned from submission.

#### Inherited from

[`SubmittedCallTxBase`](../../types/interfaces/SubmittedCallTxBase.md).[`txId`](../../types/interfaces/SubmittedCallTxBase.md#txid)

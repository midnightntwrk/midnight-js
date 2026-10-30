[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9SubmittedCallTx

# Interface: Ledger9SubmittedCallTx\<C, PCK\>

Data returned from an asynchronous call transaction submission.
Contains the transaction ID and call transaction data without waiting for finalization.

## Remarks

**Privacy-sensitive type.** The `callTxData` field carries
[Ledger9UnsubmittedCallTxData](Ledger9UnsubmittedCallTxData.md) and transitively the unproven transaction
and the call's private state. Treat as confidential when logging,
serializing, or transmitting — read only `txId` or destructure specific
non-sensitive fields rather than spreading or stringifying the whole
object.

## Extends

- [`SubmittedCallTxBase`](../../types/interfaces/SubmittedCallTxBase.md)\<[`Ledger9UnsubmittedCallTxData`](Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract$1.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Properties

### callTxData

> `readonly` **callTxData**: [`Ledger9UnsubmittedCallTxData`](Ledger9UnsubmittedCallTxData.md)

The execution data of the call that was submitted.

#### Remarks

**Privacy-sensitive.** Carries the call's private half.

#### Inherited from

[`SubmittedCallTxBase`](../../types/interfaces/SubmittedCallTxBase.md).[`callTxData`](../../types/interfaces/SubmittedCallTxBase.md#calltxdata-1)

***

### circuitId

> `readonly` **circuitId**: `PCK`

See [Ledger9FinalizedCallTxData.circuitId](Ledger9FinalizedCallTxData.md#circuitid).

***

### era

> `readonly` **era**: `"v9"`

The pipeline that produced this result: always ledger 9 here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

***

### txId

> `readonly` **txId**: `string`

The transaction ID returned from submission.

#### Inherited from

[`SubmittedCallTxBase`](../../types/interfaces/SubmittedCallTxBase.md).[`txId`](../../types/interfaces/SubmittedCallTxBase.md#txid)

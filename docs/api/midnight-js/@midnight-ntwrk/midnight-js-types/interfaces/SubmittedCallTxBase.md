[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / SubmittedCallTxBase

# Interface: SubmittedCallTxBase\<CallTxData\>

What a call transaction resolves with when it is submitted WITHOUT waiting
for finalization, in every era.

There is no finalized record here and there cannot be one — the call has not
been recorded yet. The execution data is a different matter: it is complete
by the time the transaction is submitted, and unrecoverable afterwards
without composing a second transaction, so every era carries it.

## Type Parameters

### CallTxData

`CallTxData`

That era's unsubmitted call transaction data.

## Properties

### callTxData

> `readonly` **callTxData**: `CallTxData`

The execution data of the call that was submitted.

#### Remarks

**Privacy-sensitive.** Carries the call's private half.

***

### txId

> `readonly` **txId**: `string`

The transaction ID returned from submission.

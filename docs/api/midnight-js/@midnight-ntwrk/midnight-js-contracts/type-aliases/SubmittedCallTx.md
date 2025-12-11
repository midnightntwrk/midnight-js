[**Midnight.js API Reference v3.0.0-alpha.9**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / SubmittedCallTx

# Type Alias: SubmittedCallTx\<C, ICK\>

> **SubmittedCallTx**\<`C`, `ICK`\> = `object`

Data returned from an asynchronous call transaction submission.
Contains the transaction ID and call transaction data without waiting for finalization.

## Type Parameters

### C

`C` *extends* `Contract`

### ICK

`ICK` *extends* `ImpureCircuitId`\<`C`\>

## Properties

### callTxData

> `readonly` **callTxData**: [`UnsubmittedCallTxData`](UnsubmittedCallTxData.md)\<`C`, `ICK`\>

The unproven call transaction data including private state.

***

### txId

> `readonly` **txId**: `string`

The transaction ID returned from submission.

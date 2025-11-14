[**Midnight.js API Reference v3.0.0-alpha.2**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / submitTx

# Function: submitTx()

> **submitTx**\<`C`, `ICK`\>(`providers`, `options`): `Promise`\<`FinalizedTxData`\>

Proves, balances, and submits an unproven deployment or call transaction using
the given providers, according to the given options.

## Type Parameters

### C

`C` *extends* `Contract`\<`any`, `Witnesses`\<`any`\>\>

### ICK

`ICK` *extends* `string`

## Parameters

### providers

[`SubmitTxProviders`](../type-aliases/SubmitTxProviders.md)\<`C`, `ICK`\>

The providers used to manage the transaction lifecycle.

### options

[`SubmitTxOptions`](../type-aliases/SubmitTxOptions.md)\<`ICK`\>

Configuration.

## Returns

`Promise`\<`FinalizedTxData`\>

A promise that resolves with the finalized transaction data for the invocation,
         or rejects if an error occurs along the way.

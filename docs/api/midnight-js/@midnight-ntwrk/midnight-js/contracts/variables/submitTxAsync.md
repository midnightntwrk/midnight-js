[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitTxAsync

# Variable: submitTxAsync

> `const` **submitTxAsync**: \<`C`, `PCK`\>(`providers`, `options`) => `Promise`\<`string`\>

Defined in: packages/contracts/dist/index.d.ts:445

Proves, balances, and submits an unproven deployment or call transaction using
the given providers, according to the given options. Unlike [submitTx](submitTx.md),
this function returns immediately after submission without waiting for finalization.

## Type Parameters

### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### PCK

`PCK` *extends* [`ProvableCircuitId`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>

## Parameters

### providers

[`SubmitTxProviders`](../type-aliases/SubmitTxProviders.md)\<`C`, `PCK`\>

The providers used to manage the transaction lifecycle.

### options

[`SubmitTxOptions`](../interfaces/SubmitTxOptions.md)\<`PCK`\>

Configuration.

## Returns

`Promise`\<`string`\>

A promise that resolves with the transaction ID immediately after submission,
         or rejects if an error occurs during preparation or submission.
         To watch for finalization, use providers.publicDataProvider.watchForTxData(txId).

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitTxAsync

# Function: submitTxAsync()

> **submitTxAsync**\<`PCK`\>(`providers`, `options`): `Promise`\<`string`\>

Proves, balances, and submits an unproven deployment or call transaction using
the given providers, according to the given options. Unlike [submitTx](submitTx.md),
this function returns immediately after submission without waiting for finalization.
It reads the head and routes on it exactly as [submitTx](submitTx.md) does.

## Type Parameters

### PCK

`PCK` *extends* `string`

## Parameters

### providers

`Omit`\<[`MidnightProviders`](../../types/interfaces/MidnightProviders.md)\<`PCK`\>, `"privateStateProvider"`\>

The providers used to manage the transaction lifecycle.

### options

[`SubmitTxOptions`](../interfaces/SubmitTxOptions.md)\<`PCK`\>

Configuration.

## Returns

`Promise`\<`string`\>

A promise that resolves with the transaction ID immediately after submission,
         or rejects if an error occurs during preparation or submission.
         To watch for finalization, use providers.publicDataProvider.watchForTxData(txId).

## Throws

InvalidTransactionHandleError if `unprovenTx` is not an unproven handle of this package,
        before the head is read.

## Throws

EraMismatchError for a transaction whose era is not the head's.

## Throws

ProviderFailedError if a provider rejects, with its failure sanitized onto `cause`.

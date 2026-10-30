[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createUnprovenCallTx

# Function: createUnprovenCallTx()

## Call Signature

> **createUnprovenCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`UnprovenCallTxProvidersBase`](../type-aliases/UnprovenCallTxProvidersBase.md)

#### options

[`Ledger9CallOptionsWithArguments`](../type-aliases/Ledger9CallOptionsWithArguments.md)\<`C`, `PCK`\>

#### transactionContext?

[`Ledger9TransactionContext`](../interfaces/Ledger9TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **createUnprovenCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`Ledger9UnprovenCallTxProvidersWithPrivateState`](../type-aliases/Ledger9UnprovenCallTxProvidersWithPrivateState.md)\<`C`\>

#### options

[`Ledger9CallTxOptionsWithPrivateStateId`](../type-aliases/Ledger9CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK`\>

#### transactionContext?

[`Ledger9TransactionContext`](../interfaces/Ledger9TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

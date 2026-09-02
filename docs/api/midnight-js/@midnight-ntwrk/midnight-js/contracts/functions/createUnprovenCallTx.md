[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createUnprovenCallTx

# Function: createUnprovenCallTx()

## Call Signature

> **createUnprovenCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext?`): `Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

Defined in: packages/contracts/dist/index.d.ts:818

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`UnprovenCallTxProvidersBase`](../type-aliases/UnprovenCallTxProvidersBase.md)

#### options

[`CallOptionsWithArguments`](../type-aliases/CallOptionsWithArguments.md)\<`C`, `PCK`\>

#### transactionContext?

[`TransactionContext`](../interfaces/TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **createUnprovenCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext?`): `Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

Defined in: packages/contracts/dist/index.d.ts:819

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`UnprovenCallTxProvidersWithPrivateState`](../type-aliases/UnprovenCallTxProvidersWithPrivateState.md)\<`C`\>

#### options

[`CallTxOptionsWithPrivateStateId`](../type-aliases/CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK`\>

#### transactionContext?

[`TransactionContext`](../interfaces/TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

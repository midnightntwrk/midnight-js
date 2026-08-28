[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitCallTx

# Function: submitCallTx()

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Defined in: packages/contracts/dist/index.d.ts:1228

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`SubmitTxProviders`](../type-aliases/SubmitTxProviders.md)\<`C`, `PCK`\>

#### options

[`CallOptionsWithArguments`](../type-aliases/CallOptionsWithArguments.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Defined in: packages/contracts/dist/index.d.ts:1229

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`CallTxOptionsWithPrivateStateId`](../type-aliases/CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext`): `Promise`\<[`CallResult`](../interfaces/CallResult.md)\<`C`, `PCK`\>\>

Defined in: packages/contracts/dist/index.d.ts:1230

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`CallTxOptionsWithPrivateStateId`](../type-aliases/CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK`\>

#### transactionContext

[`TransactionContext`](../interfaces/TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`CallResult`](../interfaces/CallResult.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext`): `Promise`\<[`CallResult`](../interfaces/CallResult.md)\<`C`, `PCK`\>\>

Defined in: packages/contracts/dist/index.d.ts:1231

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`SubmitTxProviders`](../type-aliases/SubmitTxProviders.md)\<`C`, `PCK`\>

#### options

[`CallOptionsWithArguments`](../type-aliases/CallOptionsWithArguments.md)\<`C`, `PCK`\>

#### transactionContext

[`TransactionContext`](../interfaces/TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`CallResult`](../interfaces/CallResult.md)\<`C`, `PCK`\>\>

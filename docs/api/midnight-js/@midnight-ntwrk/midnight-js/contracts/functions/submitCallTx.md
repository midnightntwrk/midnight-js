[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitCallTx

# Function: submitCallTx()

## Call Signature

> **submitCallTx**\<`C`, `K`\>(`providers`, `options`): `Promise`\<[`FinalizedCallTxData`](../namespaces/Ledger8/interfaces/FinalizedCallTxData.md)\<`C`, `K`\>\>

The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

Which pipeline runs is decided by the NETWORK HEAD, not by this overload: a pre-fork head runs
the retained-era-native pipeline, a post-fork head the keep-state one.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

#### K

`K` *extends* `string`

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, `K`\>

#### options

[`CallTxOptions`](../namespaces/Ledger8/type-aliases/CallTxOptions.md)\<`C`, `K`\>

### Returns

`Promise`\<[`FinalizedCallTxData`](../namespaces/Ledger8/interfaces/FinalizedCallTxData.md)\<`C`, `K`\>\>

### See

 - [KeepStatePipeline](../../documents/KeepStatePipeline.md) for the seam table, and for why a provider needs to handle the
     `'v8'` seam arm only while the network head is still pre-fork.
 - [OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Calls a circuit on a contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

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

Calls a circuit on a contract that declares private state, naming where that state is stored.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

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

Calls a circuit inside a scoped transaction, on a contract that declares private state. The
call is added to the scope rather than submitted on its own.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

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

Calls a circuit inside a scoped transaction, on a contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

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

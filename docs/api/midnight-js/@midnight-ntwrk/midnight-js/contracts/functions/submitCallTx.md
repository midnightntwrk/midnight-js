[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitCallTx

# Function: submitCallTx()

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<`C`, `PCK`\>\>

The retained-era overload. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

Which pipeline runs is decided by the NETWORK'S LEDGER VERSION, not by this overload: before the fork the
retained-era-native pipeline runs, after it the keep-state one.

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, `PCK`\>

#### options

[`Ledger8CallTxOptions`](../type-aliases/Ledger8CallTxOptions.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<`C`, `PCK`\>\>

### See

 - [KeepStatePipeline](../../documents/KeepStatePipeline.md) for the era table, and for why a provider needs to serve v8
     handles only while the network is still before the fork.
 - [OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Calls a circuit on a contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`Ledger9SubmitTxProviders`](../type-aliases/Ledger9SubmitTxProviders.md)\<`C`, `PCK`\>

#### options

[`Ledger9CallOptionsWithArguments`](../type-aliases/Ledger9CallOptionsWithArguments.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Calls a circuit on a contract that declares private state, naming where that state is stored.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`\>

#### options

[`Ledger9CallTxOptionsWithPrivateStateId`](../type-aliases/Ledger9CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext`): `Promise`\<[`Ledger9CallResult`](../interfaces/Ledger9CallResult.md)\<`C`, `PCK`\>\>

Calls a circuit inside a scoped transaction, on a contract that declares private state. The
call is added to the scope rather than submitted on its own.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`\>

#### options

[`Ledger9CallTxOptionsWithPrivateStateId`](../type-aliases/Ledger9CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK`\>

#### transactionContext

[`Ledger9TransactionContext`](../interfaces/Ledger9TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`Ledger9CallResult`](../interfaces/Ledger9CallResult.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext`): `Promise`\<[`Ledger9CallResult`](../interfaces/Ledger9CallResult.md)\<`C`, `PCK`\>\>

Calls a circuit inside a scoped transaction, on a contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`Ledger9SubmitTxProviders`](../type-aliases/Ledger9SubmitTxProviders.md)\<`C`, `PCK`\>

#### options

[`Ledger9CallOptionsWithArguments`](../type-aliases/Ledger9CallOptionsWithArguments.md)\<`C`, `PCK`\>

#### transactionContext

[`Ledger9TransactionContext`](../interfaces/Ledger9TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`Ledger9CallResult`](../interfaces/Ledger9CallResult.md)\<`C`, `PCK`\>\>

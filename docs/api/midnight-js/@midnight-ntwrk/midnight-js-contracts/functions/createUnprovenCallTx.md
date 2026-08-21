[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / createUnprovenCallTx

# Function: createUnprovenCallTx()

Calls a circuit using states fetched from the public data provider and private state
provider, then creates an unbalanced, unproven, unsubmitted, call transaction.

## Param

**providers**

The providers to use to create the call transaction.

## Param

**options**

Configuration.

## Param

**transactionContext**

Optional scoped transaction context to participate in an
       existing transaction scope.

## Throws

IncompleteCallTxPrivateStateConfig If a `privateStateId` was given but a `privateStateProvider`
                                          was not. We assume that when a user gives a `privateStateId`,
                                          they want to update the private state store.

## Remarks

The returned [UnsubmittedCallTxData](../interfaces/UnsubmittedCallTxData.md) is privacy-sensitive and carries
the unproven transaction, ZK inputs/outputs, and next private state. See
that type for handling guidance before logging, serializing, or
transmitting the result.

## Call Signature

> **createUnprovenCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext?`): `Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

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

### Type Parameters

#### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

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

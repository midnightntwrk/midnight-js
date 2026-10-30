[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createLedger9UnprovenCallTx

# Function: createLedger9UnprovenCallTx()

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

EraMismatchError with reason `'contract-era-unsupported'` for a contract whose artifacts
        do not declare ledger 9, before anything else.

## Throws

IncompleteCallTxPrivateStateConfig If a `privateStateId` was given but a `privateStateProvider`
                                          was not. We assume that when a user gives a `privateStateId`,
                                          they want to update the private state store.

## Throws

ConfigurationError If `providers.config` is missing.

## Throws

InvalidArgumentError If its `networkId` is not a non-empty string without surrounding
        whitespace.

## Throws

InvalidArgumentError If `providers.config.ttlSeconds` is not a positive whole number, or overflows a `Date`.

## Remarks

The returned [Ledger9UnsubmittedCallTxData](../interfaces/Ledger9UnsubmittedCallTxData.md) is privacy-sensitive and carries
the unproven transaction, ZK inputs/outputs, and next private state. See
that type for handling guidance before logging, serializing, or
transmitting the result.

## Call Signature

> **createLedger9UnprovenCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

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

> **createLedger9UnprovenCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

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

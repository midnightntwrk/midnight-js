[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / createUnprovenCallTxFromInitialStates

# Function: createUnprovenCallTxFromInitialStates()

Calls a circuit using the provided initial `states` and creates an unbalanced,
unproven, unsubmitted, call transaction.

## Param

## Param

Configuration.

## Param

## Param

Enables cross-contract calls; required for circuits that make them.

## Remarks

The returned [UnsubmittedCallTxData](../interfaces/UnsubmittedCallTxData.md) is privacy-sensitive and carries
the unproven transaction, ZK inputs/outputs, and next private state. See
that type for handling guidance before logging, serializing, or
transmitting the result.

## Call Signature

> **createUnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* `Contract`\<`undefined`, `Witnesses`\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](#)\<`string`\>

#### options

[`CallOptionsWithProviderDataDependencies`](../type-aliases/CallOptionsWithProviderDataDependencies.md)\<`C`, `PCK`\>

#### walletEncryptionPublicKey

`string`

#### crossContract?

`CrossContractConfig`

### Returns

`Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **createUnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* `Any`

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](#)\<`string`\>

#### options

[`CallOptionsWithPrivateState`](../type-aliases/CallOptionsWithPrivateState.md)\<`C`, `PCK`\>

#### walletEncryptionPublicKey

`string`

#### crossContract?

`CrossContractConfig`

### Returns

`Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

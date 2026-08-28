[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createUnprovenCallTxFromInitialStates

# Function: createUnprovenCallTxFromInitialStates()

## Call Signature

> **createUnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

Defined in: packages/contracts/dist/index.d.ts:783

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

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

Defined in: packages/contracts/dist/index.d.ts:784

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

#### options

[`CallOptionsWithPrivateState`](../type-aliases/CallOptionsWithPrivateState.md)\<`C`, `PCK`\>

#### walletEncryptionPublicKey

`string`

#### crossContract?

`CrossContractConfig`

### Returns

`Promise`\<[`UnsubmittedCallTxData`](../interfaces/UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

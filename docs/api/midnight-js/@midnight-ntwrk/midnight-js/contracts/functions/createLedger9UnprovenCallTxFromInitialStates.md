[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createLedger9UnprovenCallTxFromInitialStates

# Function: createLedger9UnprovenCallTxFromInitialStates()

## Call Signature

> **createLedger9UnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

#### options

[`Ledger9CallOptionsWithProviderDataDependencies`](../type-aliases/Ledger9CallOptionsWithProviderDataDependencies.md)\<`C`, `PCK`\>

#### walletEncryptionPublicKey

`string`

#### crossContract?

[`Ledger9CrossContractConfig`](../interfaces/Ledger9CrossContractConfig.md)

### Returns

`Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **createLedger9UnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

#### options

[`Ledger9CallOptionsWithPrivateState`](../type-aliases/Ledger9CallOptionsWithPrivateState.md)\<`C`, `PCK`\>

#### walletEncryptionPublicKey

`string`

#### crossContract?

[`Ledger9CrossContractConfig`](../interfaces/Ledger9CrossContractConfig.md)

### Returns

`Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

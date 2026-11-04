[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createUnprovenCallTxFromInitialStates

# Function: createUnprovenCallTxFromInitialStates()

Creates an unproven call transaction from the provided initial states, for a contract of the era
its artifacts declare. A ledger 9 contract runs [createLedger9UnprovenCallTxFromInitialStates](createLedger9UnprovenCallTxFromInitialStates.md), a
ledger 8 contract [createLedger8UnprovenCallTxFromInitialStates](createLedger8UnprovenCallTxFromInitialStates.md); their documentation covers
the parameters and the privacy-sensitive result.

## Throws

EraMismatchError with the reasons of the artifact era read: `'unwrapped-ledger9-contract'`,
        `'unrecognised-contract-shape'`, `'artifact-era-undeclared'`, `'provider-cannot-declare-era'`,
        `'unknown-artifact-runtime-version'`, `'ledger8-artifacts-in-ledger9-container'`. A failure of the
        ZK config provider propagates unchanged.

## Throws

InvalidArgumentError If `crossContract` is given for a ledger 8 contract.

## Call Signature

> **createUnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`): `Promise`\<[`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### options

[`Ledger8CallOptionsWithInitialStates`](../type-aliases/Ledger8CallOptionsWithInitialStates.md)\<`C`, `PCK`\>

#### walletEncryptionPublicKey

`string`

### Returns

`Promise`\<[`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **createUnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### options

[`Ledger9CallOptionsWithProviderDataDependencies`](../type-aliases/Ledger9CallOptionsWithProviderDataDependencies.md)\<`C`, `PCK`\>

#### walletEncryptionPublicKey

`string`

#### crossContract?

[`Ledger9CrossContractConfig`](../interfaces/Ledger9CrossContractConfig.md)

### Returns

`Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **createUnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### options

[`Ledger9CallOptionsWithPrivateState`](../type-aliases/Ledger9CallOptionsWithPrivateState.md)\<`C`, `PCK`\>

#### walletEncryptionPublicKey

`string`

#### crossContract?

[`Ledger9CrossContractConfig`](../interfaces/Ledger9CrossContractConfig.md)

### Returns

`Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

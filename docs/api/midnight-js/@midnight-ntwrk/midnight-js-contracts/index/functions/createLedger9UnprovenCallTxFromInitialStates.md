[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createLedger9UnprovenCallTxFromInitialStates

# Function: createLedger9UnprovenCallTxFromInitialStates()

Calls a circuit using the provided initial `states` and creates an unbalanced,
unproven, unsubmitted, call transaction.

## Param

**zkConfigProvider**

## Param

**options**

Configuration.

## Param

**walletEncryptionPublicKey**

## Param

**crossContract**

Enables cross-contract calls; required for circuits that make them.

## Throws

EraMismatchError with reason `'contract-era-unsupported'` for a contract whose artifacts
        do not declare ledger 9, before anything else.

## Throws

ConfigurationError If `options.config` is missing.

## Throws

InvalidArgumentError If its `networkId` is not a non-empty string without surrounding
        whitespace.

## Throws

InvalidArgumentError If `options.config.ttlSeconds` is not a positive whole number, or overflows a `Date`.

## Remarks

The returned [Ledger9UnsubmittedCallTxData](../interfaces/Ledger9UnsubmittedCallTxData.md) is privacy-sensitive and carries
the unproven transaction, ZK inputs/outputs, and next private state. See
that type for handling guidance before logging, serializing, or
transmitting the result.

## Call Signature

> **createLedger9UnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

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

> **createLedger9UnprovenCallTxFromInitialStates**\<`C`, `PCK`\>(`zkConfigProvider`, `options`, `walletEncryptionPublicKey`, `crossContract?`): `Promise`\<[`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

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

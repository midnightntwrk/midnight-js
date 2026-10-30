[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createUnprovenDeployTxFromVerifierKeys

# Function: createUnprovenDeployTxFromVerifierKeys()

Creates an unproven deploy transaction from the verifier keys, for a contract of the era its
artifacts declare. A ledger 9 contract runs [createLedger9UnprovenDeployTxFromVerifierKeys](createLedger9UnprovenDeployTxFromVerifierKeys.md), whose documentation covers
the parameters and the privacy-sensitive result.

## Throws

EraMismatchError with reason `'contract-era-unsupported'` for a contract of an era this
        function does not serve, after the artifact era is read and before anything else, and with
        the reasons of the artifact era read: `'unwrapped-ledger9-contract'`,
        `'unrecognised-contract-shape'`, `'artifact-era-undeclared'`, `'provider-cannot-declare-era'`,
        `'unknown-artifact-runtime-version'`. A failure of the ZK config provider propagates unchanged.

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`, `config`): `Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`Ledger9DeployTxOptionsBase`](../type-aliases/Ledger9DeployTxOptionsBase.md)\<`C`\>

#### encryptionPublicKey

`string`

#### config

[`MidnightConfig`](../../../midnight-js/types/interfaces/MidnightConfig.md)

### Returns

`Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`, `config`): `Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`Ledger9DeployTxOptionsWithPrivateState`](../type-aliases/Ledger9DeployTxOptionsWithPrivateState.md)\<`C`\>

#### encryptionPublicKey

`string`

#### config

[`MidnightConfig`](../../../midnight-js/types/interfaces/MidnightConfig.md)

### Returns

`Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

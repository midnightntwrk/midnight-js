[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createUnprovenDeployTxFromVerifierKeys

# Function: createUnprovenDeployTxFromVerifierKeys()

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`, `config`): `Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`Ledger9DeployTxOptionsBase`](../type-aliases/Ledger9DeployTxOptionsBase.md)\<`C`\>

#### encryptionPublicKey

`string`

#### config

[`MidnightConfig`](../../types/interfaces/MidnightConfig.md)

### Returns

`Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`, `config`): `Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`Ledger9DeployTxOptionsWithPrivateState`](../type-aliases/Ledger9DeployTxOptionsWithPrivateState.md)\<`C`\>

#### encryptionPublicKey

`string`

#### config

[`MidnightConfig`](../../types/interfaces/MidnightConfig.md)

### Returns

`Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

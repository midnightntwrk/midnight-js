[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createUnprovenDeployTxFromVerifierKeys

# Function: createUnprovenDeployTxFromVerifierKeys()

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`): `Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:1344

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`DeployTxOptionsBase`](../type-aliases/DeployTxOptionsBase.md)\<`C`\>

#### encryptionPublicKey

`string`

### Returns

`Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`): `Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:1345

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`DeployTxOptionsWithPrivateState`](../type-aliases/DeployTxOptionsWithPrivateState.md)\<`C`\>

#### encryptionPublicKey

`string`

### Returns

`Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

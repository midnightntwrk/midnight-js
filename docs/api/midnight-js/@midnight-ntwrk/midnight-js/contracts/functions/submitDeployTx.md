[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitDeployTx

# Function: submitDeployTx()

## Call Signature

> **submitDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`FinalizedDeployTxData`](../interfaces/FinalizedDeployTxData.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:1358

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`DeployTxOptionsBase`](../type-aliases/DeployTxOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`FinalizedDeployTxData`](../interfaces/FinalizedDeployTxData.md)\<`C`\>\>

## Call Signature

> **submitDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`FinalizedDeployTxData`](../interfaces/FinalizedDeployTxData.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:1359

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`DeployTxOptionsWithPrivateStateId`](../type-aliases/DeployTxOptionsWithPrivateStateId.md)\<`C`\>

### Returns

`Promise`\<[`FinalizedDeployTxData`](../interfaces/FinalizedDeployTxData.md)\<`C`\>\>

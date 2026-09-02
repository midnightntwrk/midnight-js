[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createUnprovenDeployTx

# Function: createUnprovenDeployTx()

## Call Signature

> **createUnprovenDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:1351

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

### Parameters

#### providers

[`UnprovenDeployTxProviders`](../type-aliases/UnprovenDeployTxProviders.md)\<`C`\>

#### options

[`DeployTxOptionsBase`](../type-aliases/DeployTxOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

## Call Signature

> **createUnprovenDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:1352

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### Parameters

#### providers

[`UnprovenDeployTxProviders`](../type-aliases/UnprovenDeployTxProviders.md)\<`C`\>

#### options

[`DeployTxOptionsWithPrivateState`](../type-aliases/DeployTxOptionsWithPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

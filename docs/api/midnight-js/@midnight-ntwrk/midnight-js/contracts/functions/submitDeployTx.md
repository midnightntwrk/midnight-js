[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitDeployTx

# Function: submitDeployTx()

## Call Signature

> **submitDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`FinalizedDeployTxData`](../interfaces/FinalizedDeployTxData.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:1358

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>, `unknown`\>

#### options

[`DeployTxOptionsBase`](../type-aliases/DeployTxOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`FinalizedDeployTxData`](../interfaces/FinalizedDeployTxData.md)\<`C`\>\>

## Call Signature

> **submitDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`FinalizedDeployTxData`](../interfaces/FinalizedDeployTxData.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:1359

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`DeployTxOptionsWithPrivateStateId`](../type-aliases/DeployTxOptionsWithPrivateStateId.md)\<`C`\>

### Returns

`Promise`\<[`FinalizedDeployTxData`](../interfaces/FinalizedDeployTxData.md)\<`C`\>\>

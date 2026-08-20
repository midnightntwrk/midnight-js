[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / deployContract

# Function: deployContract()

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:995

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>, `unknown`\>

#### options

[`DeployContractOptionsBase`](../type-aliases/DeployContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:996

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`DeployContractOptionsWithPrivateState`](../type-aliases/DeployContractOptionsWithPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

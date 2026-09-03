[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / findDeployedContract

# Function: findDeployedContract()

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:939

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>, `unknown`\>

#### options

[`FindDeployedContractOptionsBase`](../interfaces/FindDeployedContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:940

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsExistingPrivateState`](../interfaces/FindDeployedContractOptionsExistingPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Defined in: packages/contracts/dist/index.d.ts:941

### Type Parameters

#### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsStorePrivateState`](../interfaces/FindDeployedContractOptionsStorePrivateState.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / deployContract

# Function: deployContract()

Creates and submits a contract deployment transaction. This function is the entry point for the transaction
construction workflow and is used to create a [DeployedContract](../interfaces/DeployedContract.md) instance.

## Param

**providers**

The providers used to manage the transaction lifecycle.

## Param

**options**

Configuration.

## Throws

DeployTxFailedError If the transaction is submitted successfully but produces an error
                            when executed by the node.

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>, `unknown`\>

#### options

[`DeployContractOptionsBase`](../type-aliases/DeployContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`DeployContractOptionsWithPrivateState`](../type-aliases/DeployContractOptionsWithPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / findDeployedContract

# Function: findDeployedContract()

Creates an instance of [FoundContract](../interfaces/FoundContract.md) given the address of a deployed contract and an
optional private state ID at which an existing private state is stored. When given, the current value
at the private state ID is used as the `initialPrivateState` value in the `finalizedDeployTxData`
property of the returned `FoundContract`.

## Param

**providers**

The providers used to manage transaction lifecycles.

## Param

**options**

Configuration.

## Throws

Error Improper `privateStateId` and `initialPrivateState` configuration.

## Throws

Error No contract state could be found at `contractAddress`.

## Throws

TypeError Thrown if `contractAddress` is not correctly formatted as a contract address.

## Throws

ContractTypeError One or more circuits defined on `contract` are undefined on the contract
                          state found at `contractAddress`, or have mis-matched verifier keys.

## Throws

IncompleteFindContractPrivateStateConfig If an `initialPrivateState` is given but no
                                                 `privateStateId` is given to store it under.

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`FindDeployedContractOptionsBase`](../interfaces/FindDeployedContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsExistingPrivateState`](../interfaces/FindDeployedContractOptionsExistingPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsStorePrivateState`](../interfaces/FindDeployedContractOptionsStorePrivateState.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

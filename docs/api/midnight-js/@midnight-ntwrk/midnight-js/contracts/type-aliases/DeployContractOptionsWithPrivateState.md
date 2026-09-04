[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DeployContractOptionsWithPrivateState

# Type Alias: DeployContractOptionsWithPrivateState\<C\>

> **DeployContractOptionsWithPrivateState**\<`C`\> = [`DeployContractOptionsBase`](DeployContractOptionsBase.md)\<`C`\> & `object`

Defined in: packages/contracts/dist/index.d.ts:969

[deployContract](../functions/deployContract.md) base options with information needed to store private states;
only used if the contract being deployed has a private state.

## Type Declaration

### initialPrivateState

> `readonly` **initialPrivateState**: [`Contract.PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The private state to run the circuit against.

### privateStateId

> `readonly` **privateStateId**: [`PrivateStateId`](../../types/type-aliases/PrivateStateId.md)

An identifier for the private state of the contract being found.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

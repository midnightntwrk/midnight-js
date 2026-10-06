[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DeployContractOptionsWithPrivateState

# Type Alias: DeployContractOptionsWithPrivateState\<C\>

> **DeployContractOptionsWithPrivateState**\<`C`\> = [`DeployContractOptionsShared`](DeployContractOptionsShared.md)\<`C`\> & `object`

[deployContract](../functions/deployContract.md) options with information needed to store private states;
only used if the contract being deployed has a private state.

Both members together or neither: a state with no id has nowhere to go, and
an id with no state stores `undefined` under a name a later call will read
back.

## Type Declaration

### initialPrivateState

> `readonly` **initialPrivateState**: [`Contract.PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The private state to run the circuit against.

### privateStateId

> `readonly` **privateStateId**: [`PrivateStateId`](../../types/type-aliases/PrivateStateId.md)

An identifier for the private state of the contract being deployed.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

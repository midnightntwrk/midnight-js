[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallOptionsWithPrivateState

# Type Alias: CallOptionsWithPrivateState\<C, PCK\>

> **CallOptionsWithPrivateState**\<`C`, `PCK`\> = [`CallOptionsWithProviderDataDependencies`](CallOptionsWithProviderDataDependencies.md)\<`C`, `PCK`\> & `object`

Defined in: packages/contracts/dist/index.d.ts:69

Call options for contracts with private state.

## Type Declaration

### initialPrivateState

> `readonly` **initialPrivateState**: [`PrivateState`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/PrivateState.md)\<`C`\>

The private state to run the circuit against.

## Type Parameters

### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### PCK

`PCK` *extends* [`ProvableCircuitId`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>

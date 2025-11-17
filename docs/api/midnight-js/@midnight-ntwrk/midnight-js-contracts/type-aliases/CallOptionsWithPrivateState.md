[**Midnight.js API Reference v3.0.0-alpha.2**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsWithPrivateState

# Type Alias: CallOptionsWithPrivateState\<C, ICK\>

> **CallOptionsWithPrivateState**\<`C`, `ICK`\> = [`CallOptionsWithProviderDataDependencies`](CallOptionsWithProviderDataDependencies.md)\<`C`, `ICK`\> & `object`

Call options for contracts with private state.

## Type Declaration

### initialPrivateState

> `readonly` **initialPrivateState**: `PrivateState`\<`C`\>

The private state to run the circuit against.

## Type Parameters

### C

`C` *extends* `Contract`

### ICK

`ICK` *extends* `ImpureCircuitId`\<`C`\>

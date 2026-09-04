[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsWithPrivateState

# Type Alias: CallOptionsWithPrivateState\<C, PCK\>

> **CallOptionsWithPrivateState**\<`C`, `PCK`\> = [`CallOptionsWithProviderDataDependencies`](CallOptionsWithProviderDataDependencies.md)\<`C`, `PCK`\> & `object`

Call options for contracts with private state.

## Type Declaration

### initialPrivateState

> `readonly` **initialPrivateState**: [`Contract.PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The private state to run the circuit against.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

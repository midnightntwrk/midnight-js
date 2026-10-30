[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9CallOptionsWithPrivateState

# Type Alias: Ledger9CallOptionsWithPrivateState\<C, PCK\>

> **Ledger9CallOptionsWithPrivateState**\<`C`, `PCK`\> = [`Ledger9CallOptionsWithProviderDataDependencies`](Ledger9CallOptionsWithProviderDataDependencies.md)\<`C`, `PCK`\> & `object`

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

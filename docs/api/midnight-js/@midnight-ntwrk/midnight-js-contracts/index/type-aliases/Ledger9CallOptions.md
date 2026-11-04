[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9CallOptions

# Type Alias: Ledger9CallOptions\<C, PCK\>

> **Ledger9CallOptions**\<`C`, `PCK`\> = [`Ledger9CallOptionsWithProviderDataDependencies`](Ledger9CallOptionsWithProviderDataDependencies.md)\<`C`, `PCK`\> \| [`Ledger9CallOptionsWithPrivateState`](Ledger9CallOptionsWithPrivateState.md)\<`C`, `PCK`\>

Call options for a given contract and circuit.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallOptions

# Type Alias: CallOptions\<C, PCK\>

> **CallOptions**\<`C`, `PCK`\> = [`CallOptionsWithProviderDataDependencies`](CallOptionsWithProviderDataDependencies.md)\<`C`, `PCK`\> \| [`CallOptionsWithPrivateState`](CallOptionsWithPrivateState.md)\<`C`, `PCK`\>

Defined in: packages/contracts/dist/index.d.ts:78

Call options for a given contract and circuit.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

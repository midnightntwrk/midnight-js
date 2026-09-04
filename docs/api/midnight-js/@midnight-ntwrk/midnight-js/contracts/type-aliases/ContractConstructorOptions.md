[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractConstructorOptions

# Type Alias: ContractConstructorOptions\<C\>

> **ContractConstructorOptions**\<`C`\> = [`ContractConstructorOptionsWithProviderDataDependencies`](ContractConstructorOptionsWithProviderDataDependencies.md)\<`C`\> \| [`ContractConstructorOptionsWithPrivateState`](ContractConstructorOptionsWithPrivateState.md)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:235

Conditional type that optionally adds the inferred circuit argument types to
the target of a circuit invocation.

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

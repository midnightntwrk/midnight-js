[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractConstructorOptionsWithPrivateState

# Type Alias: ContractConstructorOptionsWithPrivateState\<C\>

> **ContractConstructorOptionsWithPrivateState**\<`C`\> = [`ContractConstructorOptionsWithProviderDataDependencies`](ContractConstructorOptionsWithProviderDataDependencies.md)\<`C`\> & `object`

Defined in: packages/contracts/dist/index.d.ts:225

Conditional type that optionally adds the inferred circuit argument types to
the target of a circuit invocation.

## Type Declaration

### initialPrivateState

> `readonly` **initialPrivateState**: [`Contract$1.PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The private state to run the circuit against.

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

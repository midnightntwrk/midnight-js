[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractConstructorOptionsWithArguments

# Type Alias: ContractConstructorOptionsWithArguments\<C\>

> **ContractConstructorOptionsWithArguments**\<`C`\> = [`Contract$1.InitializeParameters`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\> *extends* \[\] ? [`ContractConstructorOptionsBase`](../interfaces/ContractConstructorOptionsBase.md)\<`C`\> : [`ContractConstructorOptionsBase`](../interfaces/ContractConstructorOptionsBase.md)\<`C`\> & `object`

Defined in: packages/contracts/dist/index.d.ts:202

Conditional type that optionally adds the inferred contract constructor argument types
to the constructor options.

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

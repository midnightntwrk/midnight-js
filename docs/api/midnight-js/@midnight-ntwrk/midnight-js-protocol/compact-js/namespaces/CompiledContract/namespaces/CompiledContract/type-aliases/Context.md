[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../../README.md) / [compact-js](../../../../../README.md) / [CompiledContract](../../../README.md) / [CompiledContract](../README.md) / Context

# Type Alias: Context\<C\>

> **Context**\<`C`\> = [`Witnesses`](../../../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`\> \| [`CompiledAssetsPath`](../../../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/CompiledContract.d.ts:35

The context required to fully build a [CompiledContract](../../../interfaces/CompiledContract.md).

## Type Parameters

### C

`C` *extends* [`Any`](../../../../Contract/type-aliases/Any.md)

## Remarks

When looking to use a Compact compiled contract in a TypeScript program, we need to provide path
information to where the generated ZK assets can be found, along with an implementation of the witnesses
expected by the contract.

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [CompiledContract](../README.md) / make

# Variable: make

> `const` **make**: \<`C`, `PS`, `R`\>(`tag`, `ctor`) => [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `R`\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/CompiledContract.d.ts:46

Initializes an object that represents a binding to a Compact compiled contract.

## Type Parameters

### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`PS`\>

### PS

`PS` = [`PrivateState`](../../Contract/type-aliases/PrivateState.md)\<`C`\>

### R

`R` = [`Context`](../namespaces/CompiledContract/type-aliases/Context.md)\<`C`\>

## Parameters

### tag

`string`

A unique identifier that represents this type of contract.

### ctor

`Types.Ctor`\<`C`\>

The contract constructor, as imported from the compiled Compact output.

## Returns

[`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `R`\>

A [CompiledContract](../interfaces/CompiledContract.md).

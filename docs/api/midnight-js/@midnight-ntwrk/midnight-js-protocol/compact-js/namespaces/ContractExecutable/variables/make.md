[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractExecutable](../README.md) / make

# Variable: make

> `const` **make**: \<`C`, `PS`\>(`compiledContract`) => [`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, [`ContractExecutionError`](../type-aliases/ContractExecutionError.md), [`Context`](../namespaces/ContractExecutable/type-aliases/Context.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:185

Takes a Compact compiled contract, and makes it executable.

## Type Parameters

### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`PS`\>

### PS

`PS`

## Parameters

### compiledContract

[`CompiledContract`](../../CompiledContract/interfaces/CompiledContract.md)\<`C`, `PS`, `never`\>

A [CompiledContract](../../CompiledContract/interfaces/CompiledContract.md)

## Returns

[`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, [`ContractExecutionError`](../type-aliases/ContractExecutionError.md), [`Context`](../namespaces/ContractExecutable/type-aliases/Context.md)\>

A [ContractExecutable](../interfaces/ContractExecutable.md) for `compiledContract`.

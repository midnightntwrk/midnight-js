[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [CompiledContract](../README.md) / getCompiledAssetsPath

# Variable: getCompiledAssetsPath

> `const` **getCompiledAssetsPath**: \<`C`, `PS`\>(`self`) => `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/CompiledContract.d.ts:99

Retrieves a path to file based assets associated with a compiled contract.

## Type Parameters

### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`PS`\>

### PS

`PS`

## Parameters

### self

[`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`\>

The [CompiledContract](../interfaces/CompiledContract.md) from which the assets path should be retrieved.

## Returns

`string`

A string representing a path to the file assets configured for `self`.

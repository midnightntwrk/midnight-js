[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [CompiledContract](../README.md) / withVacantWitnesses

# Variable: withVacantWitnesses

> `const` **withVacantWitnesses**: \<`C`, `PS`, `R`\>(`self`) => [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`\>\>\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/CompiledContract.d.ts:71

Associates _vacant_ witnesses with a Compact compiled contract that specifies no witnesses.

## Type Parameters

### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`PS`\>

### PS

`PS`

### R

`R`

## Parameters

### self

[`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `R`\>

The [CompiledContract](../interfaces/CompiledContract.md) for which no witnesses are required.

## Returns

[`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`\>\>\>

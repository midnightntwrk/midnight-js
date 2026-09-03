[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [CompiledContract](../README.md) / withCompiledFileAssets

# Variable: withCompiledFileAssets

> `const` **withCompiledFileAssets**: \{\<`C`, `PS`, `R`\>(`compiledAssetsPath`): (`self`) => [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`CompiledAssetsPath`](../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md)\>\>; \<`C`, `PS`, `R`\>(`self`, `compiledAssetsPath`): [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`CompiledAssetsPath`](../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md)\>\>; \}

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/CompiledContract.d.ts:81

Associates a file path of where to find the compiled assets for the Compact compiled contract.

## Call Signature

> \<`C`, `PS`, `R`\>(`compiledAssetsPath`): (`self`) => [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`CompiledAssetsPath`](../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md)\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`PS`, [`Witnesses`](../../../type-aliases/Witnesses.md)\<`PS`\>\>

#### PS

`PS`

#### R

`R`

### Parameters

#### compiledAssetsPath

`R` *extends* [`CompiledAssetsPath`](../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md) ? `string` : `never`

The file path.

### Returns

A function that receives the [CompiledContract](../interfaces/CompiledContract.md) that `compiledAssetsPath` will be attached to.

(`self`) => [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`CompiledAssetsPath`](../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md)\>\>

## Call Signature

> \<`C`, `PS`, `R`\>(`self`, `compiledAssetsPath`): [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`CompiledAssetsPath`](../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md)\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`PS`, [`Witnesses`](../../../type-aliases/Witnesses.md)\<`PS`\>\>

#### PS

`PS`

#### R

`R`

### Parameters

#### self

[`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `R`\>

The [CompiledContract](../interfaces/CompiledContract.md) that `compiledAssetsPath` will be attached to.

#### compiledAssetsPath

`R` *extends* [`CompiledAssetsPath`](../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md) ? `string` : `never`

The file path.

### Returns

[`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`CompiledAssetsPath`](../../../effect/namespaces/CompactContext/type-aliases/CompiledAssetsPath.md)\>\>

## Remarks

Relative file paths will be resolved relative to the base paths provided to each service that accesses
the compiled file assets.

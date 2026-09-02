[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [CompiledContract](../README.md) / withWitnesses

# Variable: withWitnesses

> `const` **withWitnesses**: \{\<`C`, `PS`, `R`\>(`witnesses`): (`self`) => [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`, [`Witnesses`](../../Contract/type-aliases/Witnesses.md)\<`C`\>\>\>\>; \<`C`, `PS`, `R`\>(`self`, `witnesses`): [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`, [`Witnesses`](../../Contract/type-aliases/Witnesses.md)\<`C`\>\>\>\>; \}

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/CompiledContract.d.ts:52

Associates an object that implements the contract witnesses for the Compact compiled contract.

## Call Signature

> \<`C`, `PS`, `R`\>(`witnesses`): (`self`) => [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`, [`Witnesses`](../../Contract/type-aliases/Witnesses.md)\<`C`\>\>\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`PS`, [`Witnesses`](../../../type-aliases/Witnesses.md)\<`PS`\>\>

#### PS

`PS`

#### R

`R`

### Parameters

#### witnesses

`R` *extends* [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`, `W`\> ? `W` : `never`

An object implementing the witness functions required by the Compact compiled contract.

### Returns

A function that receives the [CompiledContract](../interfaces/CompiledContract.md) that `witnesses` will be attached to.

(`self`) => [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`, [`Witnesses`](../../Contract/type-aliases/Witnesses.md)\<`C`\>\>\>\>

## Call Signature

> \<`C`, `PS`, `R`\>(`self`, `witnesses`): [`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`, [`Witnesses`](../../Contract/type-aliases/Witnesses.md)\<`C`\>\>\>\>

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

The [CompiledContract](../interfaces/CompiledContract.md) that `witnesses` will be attached to.

#### witnesses

`R` *extends* [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`, `W`\> ? `W` : `never`

An object implementing the witness functions required by the Compact compiled contract.

### Returns

[`CompiledContract`](../interfaces/CompiledContract.md)\<`C`, `PS`, `Exclude`\<`R`, [`Witnesses`](../../../effect/namespaces/CompactContext/type-aliases/Witnesses.md)\<`C`, [`Witnesses`](../../Contract/type-aliases/Witnesses.md)\<`C`\>\>\>\>

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractExecutable](../README.md) / provide

# Variable: provide

> `const` **provide**: \{\<`LA`, `LE`, `LR`\>(`layer`): \<`C`, `PS`, `E`, `R`\>(`self`) => [`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, `LE` \| `E`, `LR` \| `Exclude`\<`R`, `LA`\>\>; \<`C`, `PS`, `E`, `R`, `LA`, `LE`, `LR`\>(`self`, `layer`): [`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, `E` \| `LE`, `LR` \| `Exclude`\<`R`, `LA`\>\>; \}

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractExecutable.d.ts:191

Provides a layer to the executable contract.

## Call Signature

> \<`LA`, `LE`, `LR`\>(`layer`): \<`C`, `PS`, `E`, `R`\>(`self`) => [`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, `LE` \| `E`, `LR` \| `Exclude`\<`R`, `LA`\>\>

### Type Parameters

#### LA

`LA`

#### LE

`LE`

#### LR

`LR`

### Parameters

#### layer

`Layer`\<`LA`, `LE`, `LR`\>

The layer to provide.

### Returns

A function that receives the [ContractExecutable](../interfaces/ContractExecutable.md) that `layer` should be provided to.

\<`C`, `PS`, `E`, `R`\>(`self`) => [`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, `LE` \| `E`, `LR` \| `Exclude`\<`R`, `LA`\>\>

## Call Signature

> \<`C`, `PS`, `E`, `R`, `LA`, `LE`, `LR`\>(`self`, `layer`): [`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, `E` \| `LE`, `LR` \| `Exclude`\<`R`, `LA`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`PS`, [`Witnesses`](../../../type-aliases/Witnesses.md)\<`PS`\>\>

#### PS

`PS`

#### E

`E`

#### R

`R`

#### LA

`LA`

#### LE

`LE`

#### LR

`LR`

### Parameters

#### self

[`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, `E`, `R`\>

The [ContractExecutable](../interfaces/ContractExecutable.md) that `layer` should be provided with.

#### layer

`Layer`\<`LA`, `LE`, `LR`\>

The layer to provide.

### Returns

[`ContractExecutable`](../interfaces/ContractExecutable.md)\<`C`, `PS`, `E` \| `LE`, `LR` \| `Exclude`\<`R`, `LA`\>\>

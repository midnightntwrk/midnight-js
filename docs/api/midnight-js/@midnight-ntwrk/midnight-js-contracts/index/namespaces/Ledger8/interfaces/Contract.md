[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / Contract

# Interface: Contract\<PS\>

A contract instance produced by the retained (`compact-runtime@0.16`)
toolchain, as the real generated artifact declares it: `witnesses`, the three
circuit collections, and a synchronous `initialState`.

Structurally excludes a current-era contract, whose `initialState` and
circuit members return `Promise`s.

## Type Parameters

### PS

`PS` = `unknown`

## Properties

### circuits

> `readonly` **circuits**: `Readonly`\<`Record`\<`string`, [`Circuit`](../type-aliases/Circuit.md)\>\>

***

### impureCircuits

> `readonly` **impureCircuits**: `Readonly`\<`Record`\<`string`, [`Circuit`](../type-aliases/Circuit.md)\>\>

***

### provableCircuits

> `readonly` **provableCircuits**: `Readonly`\<`Record`\<`string`, [`Circuit`](../type-aliases/Circuit.md)\>\>

***

### witnesses

> `readonly` **witnesses**: `Readonly`\<`Record`\<`string`, [`Witness`](../type-aliases/Witness.md)\<`PS`\>\>\>

## Methods

### initialState()

> **initialState**(...`args`): [`InitialStateResult`](InitialStateResult.md)\<`PS`\>

#### Parameters

##### args

...`never`[]

#### Returns

[`InitialStateResult`](InitialStateResult.md)\<`PS`\>

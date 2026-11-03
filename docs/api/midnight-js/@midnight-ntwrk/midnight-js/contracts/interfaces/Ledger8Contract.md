[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8Contract

# Interface: Ledger8Contract\<PS\>

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

> `readonly` **circuits**: `Readonly`\<`Record`\<`string`, [`Ledger8Circuit`](../type-aliases/Ledger8Circuit.md)\>\>

***

### impureCircuits

> `readonly` **impureCircuits**: `Readonly`\<`Record`\<`string`, [`Ledger8Circuit`](../type-aliases/Ledger8Circuit.md)\>\>

***

### provableCircuits

> `readonly` **provableCircuits**: `Readonly`\<`Record`\<`string`, [`Ledger8Circuit`](../type-aliases/Ledger8Circuit.md)\>\>

***

### witnesses

> `readonly` **witnesses**: `Readonly`\<`Record`\<`string`, [`Ledger8Witness`](../type-aliases/Ledger8Witness.md)\<`PS`\>\>\>

## Methods

### initialState()

> **initialState**(...`args`): [`Ledger8InitialStateResult`](Ledger8InitialStateResult.md)\<`PS`\>

#### Parameters

##### args

...`never`[]

#### Returns

[`Ledger8InitialStateResult`](Ledger8InitialStateResult.md)\<`PS`\>

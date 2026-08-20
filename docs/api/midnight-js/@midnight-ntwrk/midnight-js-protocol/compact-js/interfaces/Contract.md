[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-js](../README.md) / Contract

# Interface: Contract\<PS, W\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/Contract.d.ts:20

## Type Parameters

### PS

`PS`

### W

`W` *extends* [`Witnesses`](../type-aliases/Witnesses.md)\<`PS`\> = [`Witnesses`](../type-aliases/Witnesses.md)\<`PS`\>

## Properties

### circuits

> **circuits**: [`Circuits`](../type-aliases/Circuits.md)\<`PS`\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/Contract.d.ts:22

***

### provableCircuits

> **provableCircuits**: [`ProvableCircuits`](../type-aliases/ProvableCircuits.md)\<`PS`\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/Contract.d.ts:23

***

### witnesses

> **witnesses**: `W`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/Contract.d.ts:21

## Methods

### initialState()

> **initialState**(`context`, ...`args`): `Promise`\<[`ConstructorResult`](../../compact-runtime/interfaces/ConstructorResult.md)\<`PS`\>\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/Contract.d.ts:24

#### Parameters

##### context

[`ConstructorContext`](../../compact-runtime/interfaces/ConstructorContext.md)\<`PS`\>

##### args

...`any`[]

#### Returns

`Promise`\<[`ConstructorResult`](../../compact-runtime/interfaces/ConstructorResult.md)\<`PS`\>\>

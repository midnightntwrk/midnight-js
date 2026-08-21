[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [NetworkId](../README.md) / NetworkId

# Interface: NetworkId

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/NetworkId.d.ts:19

Represents a Midnight network identifier.

## Remarks

A NetworkId can be constructed by calling [make](../variables/make.md) with a valid
[NetworkIdMoniker](../../NetworkIdMoniker/variables/NetworkIdMoniker.md) identifying the network. Alternatively, in order
to use the Midnight MainNet, use the exported instance [MainNet](../variables/MainNet.md).

## See

 - [NetworkIdInput](../type-aliases/NetworkIdInput.md)
 - [make](../variables/make.md)

## Extends

- `Equal`.`Inspectable`

## Properties

### \[MonikerSymbol\]

> `readonly` **\[MonikerSymbol\]**: `true` \| [`NetworkIdMoniker`](../../NetworkIdMoniker/type-aliases/NetworkIdMoniker.md)

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/NetworkId.d.ts:21

***

### \[TypeId\]

> `readonly` **\[TypeId\]**: *typeof* [`TypeId`](../type-aliases/TypeId.md)

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/NetworkId.d.ts:20

***

### isMainNet

> `readonly` **isMainNet**: () => `boolean`

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/NetworkId.d.ts:27

Determines if the network identifier represents the Midnight MainNet.

#### Returns

`boolean`

`true` if the NetworkId represents the Midnight MainNet; `false` otherwise.

## Methods

### \[NodeInspectSymbol\]()

> **\[NodeInspectSymbol\]**(): `unknown`

Defined in: node\_modules/effect/dist/dts/Inspectable.d.ts:22

#### Returns

`unknown`

#### Inherited from

`Inspectable.[NodeInspectSymbol]`

***

### \[symbol\]()

> **\[symbol\]**(`that`): `boolean`

Defined in: node\_modules/effect/dist/dts/Equal.d.ts:16

#### Parameters

##### that

`Equal`

#### Returns

`boolean`

#### Inherited from

`Equal.Equal.[symbol]`

***

### \[symbol\]()

> **\[symbol\]**(): `number`

Defined in: node\_modules/effect/dist/dts/Hash.d.ts:11

#### Returns

`number`

#### Inherited from

`Equal.Equal.[symbol]`

***

### toJSON()

> **toJSON**(): `unknown`

Defined in: node\_modules/effect/dist/dts/Inspectable.d.ts:21

#### Returns

`unknown`

#### Inherited from

`Inspectable.toJSON`

***

### toString()

> **toString**(): `string`

Defined in: node\_modules/effect/dist/dts/Inspectable.d.ts:20

#### Returns

`string`

#### Inherited from

`Inspectable.toString`

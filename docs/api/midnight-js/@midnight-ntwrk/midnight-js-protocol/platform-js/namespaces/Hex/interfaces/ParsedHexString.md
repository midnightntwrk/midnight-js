[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [Hex](../README.md) / ParsedHexString

# Interface: ParsedHexString

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Hex.d.ts:87

The result of parsing a hex-encoded string.

## See

[parseHex](../variables/parseHex.md)

## Extends

- `Inspectable`

## Properties

### byteChars

> `readonly` **byteChars**: `string`

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Hex.d.ts:95

The captured sequence of _whole_ bytes found in the source string.

***

### hasPrefix

> `readonly` **hasPrefix**: `boolean`

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Hex.d.ts:91

A flag indicating if the hex-string has a `'0x'` prefix.

***

### incompleteChars

> `readonly` **incompleteChars**: `string`

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Hex.d.ts:100

The remaining characters of incomplete bytes and/or the non hexadecimal characters found in the
source string.

## Methods

### \[NodeInspectSymbol\]()

> **\[NodeInspectSymbol\]**(): `unknown`

Defined in: node\_modules/effect/dist/dts/Inspectable.d.ts:22

#### Returns

`unknown`

#### Inherited from

`Inspectable.[NodeInspectSymbol]`

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

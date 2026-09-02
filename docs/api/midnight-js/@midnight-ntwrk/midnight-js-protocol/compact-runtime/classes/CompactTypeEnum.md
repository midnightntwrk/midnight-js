[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CompactTypeEnum

# Class: CompactTypeEnum

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:104

Runtime type of an enum with a given number of entries

## Implements

- [`CompactType`](../interfaces/CompactType.md)\<`number`\>

## Constructors

### Constructor

> **new CompactTypeEnum**(`maxValue`, `length`): `CompactTypeEnum`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:107

#### Parameters

##### maxValue

`number`

##### length

`number`

#### Returns

`CompactTypeEnum`

## Properties

### length

> `readonly` **length**: `number`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:106

***

### maxValue

> `readonly` **maxValue**: `number`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:105

## Methods

### alignment()

> **alignment**(): [`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:108

The field-aligned binary alignment of this type.

#### Returns

[`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`alignment`](../interfaces/CompactType.md#alignment)

***

### fromValue()

> **fromValue**(`value`): `number`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:109

Converts this type's field-aligned binary representation to its TypeScript
representation destructively; (partially) consuming the input, and
ignoring superflous data for chaining.

#### Parameters

##### value

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Returns

`number`

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`fromValue`](../interfaces/CompactType.md#fromvalue)

***

### toValue()

> **toValue**(`value`): [`Value`](../../onchain-runtime/type-aliases/Value.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:110

Converts this type's TypeScript representation to its field-aligned binary
representation

#### Parameters

##### value

`number`

#### Returns

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`toValue`](../interfaces/CompactType.md#tovalue)

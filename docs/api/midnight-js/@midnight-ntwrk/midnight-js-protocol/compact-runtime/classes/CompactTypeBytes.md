[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CompactTypeBytes

# Class: CompactTypeBytes

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:141

Runtime type of the builtin `Bytes` types

## Implements

- [`CompactType`](../interfaces/CompactType.md)\<`Uint8Array`\>

## Constructors

### Constructor

> **new CompactTypeBytes**(`length`): `CompactTypeBytes`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:143

#### Parameters

##### length

`number`

#### Returns

`CompactTypeBytes`

## Properties

### length

> `readonly` **length**: `number`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:142

## Methods

### alignment()

> **alignment**(): [`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:144

The field-aligned binary alignment of this type.

#### Returns

[`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`alignment`](../interfaces/CompactType.md#alignment)

***

### fromValue()

> **fromValue**(`value`): `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:145

Converts this type's field-aligned binary representation to its TypeScript
representation destructively; (partially) consuming the input, and
ignoring superflous data for chaining.

#### Parameters

##### value

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Returns

`Uint8Array`

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`fromValue`](../interfaces/CompactType.md#fromvalue)

***

### toValue()

> **toValue**(`value`): [`Value`](../../onchain-runtime/type-aliases/Value.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:146

Converts this type's TypeScript representation to its field-aligned binary
representation

#### Parameters

##### value

`Uint8Array`

#### Returns

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`toValue`](../interfaces/CompactType.md#tovalue)

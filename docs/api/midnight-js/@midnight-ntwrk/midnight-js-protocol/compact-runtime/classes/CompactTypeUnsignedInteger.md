[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CompactTypeUnsignedInteger

# Class: CompactTypeUnsignedInteger

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:115

Runtime type of the builtin `Unsigned Integer` types

## Implements

- [`CompactType`](../interfaces/CompactType.md)\<`bigint`\>

## Constructors

### Constructor

> **new CompactTypeUnsignedInteger**(`maxValue`, `length`): `CompactTypeUnsignedInteger`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:118

#### Parameters

##### maxValue

`bigint`

##### length

`number`

#### Returns

`CompactTypeUnsignedInteger`

## Properties

### length

> `readonly` **length**: `number`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:117

***

### maxValue

> `readonly` **maxValue**: `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:116

## Methods

### alignment()

> **alignment**(): [`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:119

The field-aligned binary alignment of this type.

#### Returns

[`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`alignment`](../interfaces/CompactType.md#alignment)

***

### fromValue()

> **fromValue**(`value`): `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:120

Converts this type's field-aligned binary representation to its TypeScript
representation destructively; (partially) consuming the input, and
ignoring superflous data for chaining.

#### Parameters

##### value

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Returns

`bigint`

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`fromValue`](../interfaces/CompactType.md#fromvalue)

***

### toValue()

> **toValue**(`value`): [`Value`](../../onchain-runtime/type-aliases/Value.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:121

Converts this type's TypeScript representation to its field-aligned binary
representation

#### Parameters

##### value

`bigint`

#### Returns

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`toValue`](../interfaces/CompactType.md#tovalue)

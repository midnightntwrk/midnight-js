[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CompactTypeVector

# Class: CompactTypeVector\<A\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:126

Runtime type of the builtin `Vector` types

## Type Parameters

### A

`A`

## Implements

- [`CompactType`](../interfaces/CompactType.md)\<`A`[]\>

## Constructors

### Constructor

> **new CompactTypeVector**\<`A`\>(`length`, `type`): `CompactTypeVector`\<`A`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:129

#### Parameters

##### length

`number`

##### type

[`CompactType`](../interfaces/CompactType.md)\<`A`\>

#### Returns

`CompactTypeVector`\<`A`\>

## Properties

### length

> `readonly` **length**: `number`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:127

***

### type

> `readonly` **type**: [`CompactType`](../interfaces/CompactType.md)\<`A`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:128

## Methods

### alignment()

> **alignment**(): [`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:130

The field-aligned binary alignment of this type.

#### Returns

[`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`alignment`](../interfaces/CompactType.md#alignment)

***

### fromValue()

> **fromValue**(`value`): `A`[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:131

Converts this type's field-aligned binary representation to its TypeScript
representation destructively; (partially) consuming the input, and
ignoring superflous data for chaining.

#### Parameters

##### value

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Returns

`A`[]

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`fromValue`](../interfaces/CompactType.md#fromvalue)

***

### toValue()

> **toValue**(`value`): [`Value`](../../onchain-runtime/type-aliases/Value.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:132

Converts this type's TypeScript representation to its field-aligned binary
representation

#### Parameters

##### value

`A`[]

#### Returns

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`toValue`](../interfaces/CompactType.md#tovalue)

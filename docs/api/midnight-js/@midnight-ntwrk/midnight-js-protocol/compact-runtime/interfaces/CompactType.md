[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CompactType

# Interface: CompactType\<A\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:5

A runtime representation of a type in Compact

## Type Parameters

### A

`A`

## Methods

### alignment()

> **alignment**(): [`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:9

The field-aligned binary alignment of this type.

#### Returns

[`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

***

### fromValue()

> **fromValue**(`value`): `A`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:20

Converts this type's field-aligned binary representation to its TypeScript
representation destructively; (partially) consuming the input, and
ignoring superflous data for chaining.

#### Parameters

##### value

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Returns

`A`

***

### toValue()

> **toValue**(`value`): [`Value`](../../onchain-runtime/type-aliases/Value.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:14

Converts this type's TypeScript representation to its field-aligned binary
representation

#### Parameters

##### value

`A`

#### Returns

[`Value`](../../onchain-runtime/type-aliases/Value.md)

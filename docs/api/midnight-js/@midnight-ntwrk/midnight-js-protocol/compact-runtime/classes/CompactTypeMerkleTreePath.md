[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CompactTypeMerkleTreePath

# Class: CompactTypeMerkleTreePath\<A\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:98

Runtime type of [MerkleTreePath](../interfaces/MerkleTreePath.md)

## Type Parameters

### A

`A`

## Implements

- [`CompactType`](../interfaces/CompactType.md)\<[`MerkleTreePath`](../interfaces/MerkleTreePath.md)\<`A`\>\>

## Constructors

### Constructor

> **new CompactTypeMerkleTreePath**\<`A`\>(`n`, `leaf`): `CompactTypeMerkleTreePath`\<`A`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:101

#### Parameters

##### n

`number`

##### leaf

[`CompactType`](../interfaces/CompactType.md)\<`A`\>

#### Returns

`CompactTypeMerkleTreePath`\<`A`\>

## Properties

### leaf

> `readonly` **leaf**: [`CompactType`](../interfaces/CompactType.md)\<`A`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:99

***

### path

> `readonly` **path**: [`CompactTypeVector`](CompactTypeVector.md)\<[`MerkleTreePathEntry`](../interfaces/MerkleTreePathEntry.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:100

## Methods

### alignment()

> **alignment**(): [`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:102

The field-aligned binary alignment of this type.

#### Returns

[`Alignment`](../../onchain-runtime/type-aliases/Alignment.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`alignment`](../interfaces/CompactType.md#alignment)

***

### fromValue()

> **fromValue**(`value`): [`MerkleTreePath`](../interfaces/MerkleTreePath.md)\<`A`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:103

Converts this type's field-aligned binary representation to its TypeScript
representation destructively; (partially) consuming the input, and
ignoring superflous data for chaining.

#### Parameters

##### value

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Returns

[`MerkleTreePath`](../interfaces/MerkleTreePath.md)\<`A`\>

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`fromValue`](../interfaces/CompactType.md#fromvalue)

***

### toValue()

> **toValue**(`value`): [`Value`](../../onchain-runtime/type-aliases/Value.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/compact-types.d.ts:104

Converts this type's TypeScript representation to its field-aligned binary
representation

#### Parameters

##### value

[`MerkleTreePath`](../interfaces/MerkleTreePath.md)\<`A`\>

#### Returns

[`Value`](../../onchain-runtime/type-aliases/Value.md)

#### Implementation of

[`CompactType`](../interfaces/CompactType.md).[`toValue`](../interfaces/CompactType.md#tovalue)

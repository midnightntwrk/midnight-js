[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / StateBoundedMerkleTree

# Class: StateBoundedMerkleTree

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:967

Represents a fixed-depth Merkle tree storing hashed data, whose preimages
are unknown

## Constructors

### Constructor

> **new StateBoundedMerkleTree**(`height`): `StateBoundedMerkleTree`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:971

Create a blank tree with the given height

#### Parameters

##### height

`number`

#### Returns

`StateBoundedMerkleTree`

## Properties

### height

> `readonly` **height**: `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1021

## Methods

### collapse()

> **collapse**(`start`, `end`): `StateBoundedMerkleTree`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1017

**`Internal`**

Erases all but necessary hashes between, and inclusive of, `start` and
`end` inidices

#### Parameters

##### start

`bigint`

##### end

`bigint`

#### Returns

`StateBoundedMerkleTree`

#### Throws

If the indices are out-of-bounds for the tree, or `end < start`

***

### findPathForLeaf()

> **findPathForLeaf**(`leaf`, `indexStart?`, `indexEnd?`, `alreadyHashed?`): [`AlignedValue`](../type-aliases/AlignedValue.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:985

**`Internal`**

Internal implementation of the finding path primitive.
Returns undefined if the leaf is not in the tree.

#### Parameters

##### leaf

[`AlignedValue`](../type-aliases/AlignedValue.md)

##### indexStart?

`bigint`

##### indexEnd?

`bigint`

##### alreadyHashed?

`boolean`

#### Returns

[`AlignedValue`](../type-aliases/AlignedValue.md) \| `undefined`

***

### pathForLeaf()

> **pathForLeaf**(`index`, `leaf`): [`AlignedValue`](../type-aliases/AlignedValue.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:997

**`Internal`**

Internal implementation of the path construction primitive

#### Parameters

##### index

`bigint`

##### leaf

[`AlignedValue`](../type-aliases/AlignedValue.md)

#### Returns

[`AlignedValue`](../type-aliases/AlignedValue.md)

#### Throws

If the index is out-of-bounds for the tree

***

### rehash()

> **rehash**(): `StateBoundedMerkleTree`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1010

Rehashes the tree, updating all internal hashes and ensuring all
node hashes are present. Necessary because the onchain runtime does
not automatically rehash trees.

#### Returns

`StateBoundedMerkleTree`

***

### root()

> **root**(): [`AlignedValue`](../type-aliases/AlignedValue.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:978

**`Internal`**

Internal implementation of the merkle tree root primitive.
Returns undefined if the tree has not been fully hashed.

#### Returns

[`AlignedValue`](../type-aliases/AlignedValue.md) \| `undefined`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1019

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### update()

> **update**(`index`, `leaf`): `StateBoundedMerkleTree`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:1003

Inserts a value into the Merkle tree, returning the updated tree

#### Parameters

##### index

`bigint`

##### leaf

[`AlignedValue`](../type-aliases/AlignedValue.md)

#### Returns

`StateBoundedMerkleTree`

#### Throws

If the index is out-of-bounds for the tree

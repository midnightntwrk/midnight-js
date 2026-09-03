[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustStateMerkleTreeCollapsedUpdate

# Class: DustStateMerkleTreeCollapsedUpdate

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1602

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1606

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1608

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `DustStateMerkleTreeCollapsedUpdate`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1607

#### Parameters

##### raw

`Uint8Array`

#### Returns

`DustStateMerkleTreeCollapsedUpdate`

***

### newFromCommitmentTree()

> `static` **newFromCommitmentTree**(`state`, `start`, `end`): `DustStateMerkleTreeCollapsedUpdate`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1605

#### Parameters

##### state

[`DustUtxoState`](DustUtxoState.md)

##### start

`bigint`

##### end

`bigint`

#### Returns

`DustStateMerkleTreeCollapsedUpdate`

***

### newFromGenerationTree()

> `static` **newFromGenerationTree**(`state`, `start`, `end`): `DustStateMerkleTreeCollapsedUpdate`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1604

#### Parameters

##### state

[`DustGenerationState`](DustGenerationState.md)

##### start

`bigint`

##### end

`bigint`

#### Returns

`DustStateMerkleTreeCollapsedUpdate`

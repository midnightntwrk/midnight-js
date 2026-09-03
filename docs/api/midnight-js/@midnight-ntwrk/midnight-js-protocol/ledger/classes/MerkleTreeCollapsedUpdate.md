[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / MerkleTreeCollapsedUpdate

# Class: MerkleTreeCollapsedUpdate

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2829

A compact delta on the coin commitments Merkle tree, used to keep local
spending trees in sync with the global state without requiring receiving all
transactions.

## Constructors

### Constructor

> **new MerkleTreeCollapsedUpdate**(`state`, `start`, `end`): `MerkleTreeCollapsedUpdate`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2836

Create a new compact update from a non-compact state, and inclusive
`start` and `end` indices

#### Parameters

##### state

[`ZswapChainState`](ZswapChainState.md)

##### start

`bigint`

##### end

`bigint`

#### Returns

`MerkleTreeCollapsedUpdate`

#### Throws

If the indices are out-of-bounds for the state, or `end < start`

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2838

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2842

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `MerkleTreeCollapsedUpdate`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2840

#### Parameters

##### raw

`Uint8Array`

#### Returns

`MerkleTreeCollapsedUpdate`

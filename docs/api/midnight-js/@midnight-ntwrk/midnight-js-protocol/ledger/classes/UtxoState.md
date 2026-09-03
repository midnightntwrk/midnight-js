[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / UtxoState

# Class: UtxoState

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1941

The sub-state for unshielded UTXOs

## Constructors

### Constructor

> **new UtxoState**(): `UtxoState`

#### Returns

`UtxoState`

## Properties

### utxos

> `readonly` **utxos**: `Set`\<[`Utxo`](../type-aliases/Utxo.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1951

The set of valid UTXOs

## Methods

### delta()

> **delta**(`prior`, `filterBy?`): \[`Set`\<[`Utxo`](../type-aliases/Utxo.md)\>, `Set`\<[`Utxo`](../type-aliases/Utxo.md)\>\]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1966

Given a prior UTXO state, produce the set differences `this \ prior`, and
`prior \ this`, optionally filtered by a further condition.

Note that this should be more efficient than iterating or manifesting the
[utxos](#utxos) value, as the low-level implementation can avoid traversing
shared sub-structures.

#### Parameters

##### prior

`UtxoState`

##### filterBy?

(`utxo`) => `boolean`

#### Returns

\[`Set`\<[`Utxo`](../type-aliases/Utxo.md)\>, `Set`\<[`Utxo`](../type-aliases/Utxo.md)\>\]

***

### filter()

> **filter**(`addr`): `Set`\<[`Utxo`](../type-aliases/Utxo.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1956

Filters out the UTXOs owned by a specific user address

#### Parameters

##### addr

`string`

#### Returns

`Set`\<[`Utxo`](../type-aliases/Utxo.md)\>

***

### lookupMeta()

> **lookupMeta**(`utxo`): [`UtxoMeta`](UtxoMeta.md) \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1946

Lookup the metadata for a specific UTXO.

#### Parameters

##### utxo

[`Utxo`](../type-aliases/Utxo.md)

#### Returns

[`UtxoMeta`](UtxoMeta.md) \| `undefined`

***

### new()

> `static` **new**(`utxos`): `UtxoState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1942

#### Parameters

##### utxos

`Map`\<[`Utxo`](../type-aliases/Utxo.md), [`UtxoMeta`](UtxoMeta.md)\>

#### Returns

`UtxoState`

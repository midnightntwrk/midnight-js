[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustStateChanges

# Class: DustStateChanges

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1620

## Constructors

### Constructor

> **new DustStateChanges**(`source`, `receivedUtxos`, `spentUtxos`): `DustStateChanges`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1621

#### Parameters

##### source

`string`

##### receivedUtxos

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)[]

##### spentUtxos

[`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)[]

#### Returns

`DustStateChanges`

## Properties

### receivedUtxos

> `readonly` **receivedUtxos**: [`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1630

The UTXOs that were received in this state change

***

### source

> `readonly` **source**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1626

The source of the state change, as a hex-encoded string

***

### spentUtxos

> `readonly` **spentUtxos**: [`QualifiedDustOutput`](../type-aliases/QualifiedDustOutput.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1634

The UTXOs that were spent in this state change

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1622

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustParameters

# Class: DustParameters

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1570

## Constructors

### Constructor

> **new DustParameters**(`nightDustRatio`, `generationDecayRate`, `dustGracePeriodSeconds`): `DustParameters`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1571

#### Parameters

##### nightDustRatio

`bigint`

##### generationDecayRate

`bigint`

##### dustGracePeriodSeconds

`bigint`

#### Returns

`DustParameters`

## Properties

### dustGracePeriodSeconds

> **dustGracePeriodSeconds**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1577

***

### generationDecayRate

> **generationDecayRate**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1576

***

### nightDustRatio

> **nightDustRatio**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1575

***

### timeToCapSeconds

> `readonly` **timeToCapSeconds**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1578

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1572

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1574

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `DustParameters`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1573

#### Parameters

##### raw

`Uint8Array`

#### Returns

`DustParameters`

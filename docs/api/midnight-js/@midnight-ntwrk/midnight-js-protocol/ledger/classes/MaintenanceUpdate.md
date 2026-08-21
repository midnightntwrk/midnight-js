[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / MaintenanceUpdate

# Class: MaintenanceUpdate

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2312

A contract maintenance update, updating associated operations, or
changing the maintenance authority.

## Constructors

### Constructor

> **new MaintenanceUpdate**(`address`, `updates`, `counter`): `MaintenanceUpdate`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2313

#### Parameters

##### address

`string`

##### updates

[`SingleUpdate`](../type-aliases/SingleUpdate.md)[]

##### counter

`bigint`

#### Returns

`MaintenanceUpdate`

## Properties

### address

> `readonly` **address**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2329

The address this deployment will attempt to create

***

### counter

> `readonly` **counter**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2337

The counter this update is valid against

***

### dataToSign

> `readonly` **dataToSign**: `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2325

The raw data any valid signature must be over to approve this update.

***

### signatures

> `readonly` **signatures**: \[`bigint`, [`Signature`](../type-aliases/Signature.md)\][]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2341

The signatures on this update

***

### updates

> `readonly` **updates**: [`SingleUpdate`](../type-aliases/SingleUpdate.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2333

The updates to carry out

## Methods

### addSignature()

> **addSignature**(`idx`, `signature`): `MaintenanceUpdate`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2318

Adds a new signature to this update

#### Parameters

##### idx

`bigint`

##### signature

[`Signature`](../type-aliases/Signature.md)

#### Returns

`MaintenanceUpdate`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2320

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / ContractMaintenanceAuthority

# Class: ContractMaintenanceAuthority

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:769

A committee permitted to make changes to this contract. If a threshold of
the public keys in this committee sign off, they can change the rules of
this contract, or recompile it for a new version.

If the threshold is greater than the number of committee members, it is
impossible for them to sign anything.

## Constructors

### Constructor

> **new ContractMaintenanceAuthority**(`committee`, `threshold`, `counter?`): `ContractMaintenanceAuthority`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:779

Constructs a new authority from its components

If not supplied, `counter` will default to `0n`. Values should be
non-negative, and at most 2^32 - 1.

At deployment, `counter` must be `0n`, and any subsequent update should
set counter to exactly one greater than the current value.

#### Parameters

##### committee

[`SignatureVerifyingKey`](../type-aliases/SignatureVerifyingKey.md)[]

##### threshold

`number`

##### counter?

`bigint`

#### Returns

`ContractMaintenanceAuthority`

## Properties

### committee

> `readonly` **committee**: [`SignatureVerifyingKey`](../type-aliases/SignatureVerifyingKey.md)[]

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:784

The committee public keys

***

### counter

> `readonly` **counter**: `bigint`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:792

The replay protection counter

***

### threshold

> `readonly` **threshold**: `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:788

How many keys must sign rule changes

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:794

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:798

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `ContractMaintenanceAuthority`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:796

#### Parameters

##### raw

`Uint8Array`

#### Returns

`ContractMaintenanceAuthority`

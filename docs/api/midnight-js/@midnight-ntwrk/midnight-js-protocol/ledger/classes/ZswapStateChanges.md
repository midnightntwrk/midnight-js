[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ZswapStateChanges

# Class: ZswapStateChanges

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2949

## Constructors

### Constructor

> **new ZswapStateChanges**(`source`, `receivedCoins`, `spentCoins`): `ZswapStateChanges`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2950

#### Parameters

##### source

`string`

##### receivedCoins

[`QualifiedShieldedCoinInfo`](../type-aliases/QualifiedShieldedCoinInfo.md)[]

##### spentCoins

[`QualifiedShieldedCoinInfo`](../type-aliases/QualifiedShieldedCoinInfo.md)[]

#### Returns

`ZswapStateChanges`

## Properties

### receivedCoins

> `readonly` **receivedCoins**: [`QualifiedShieldedCoinInfo`](../type-aliases/QualifiedShieldedCoinInfo.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2959

The coins that were received in this state change

***

### source

> `readonly` **source**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2955

The source of the state change, as a hex-encoded string

***

### spentCoins

> `readonly` **spentCoins**: [`QualifiedShieldedCoinInfo`](../type-aliases/QualifiedShieldedCoinInfo.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2963

The coins that were spent in this state change

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2951

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / SigningKeyNotStoredError

# Class: SigningKeyNotStoredError

An error indicating that a retained-era maintenance authority REPLACEMENT was confirmed on chain,
but the private-state provider refused to store the new key.

[Ledger8SigningKeyNotStoredError.signingKey](#signingkey) is NAMED but never rendered into the message:
the key it held before no longer authorizes anything on the contract, so this is the only copy of
the one that does.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new SigningKeyNotStoredError**(`contractAddress`, `signingKey`, `cause`): `Ledger8SigningKeyNotStoredError`

#### Parameters

##### contractAddress

`string`

The contract whose authority was replaced.

##### signingKey

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The new authority's key, which the store refused.

##### cause

`unknown`

The store's own failure.

#### Returns

`Ledger8SigningKeyNotStoredError`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY_NOT_STORED"` = `CONTRACTS_ERROR_CODES.LEDGER8_SIGNING_KEY_NOT_STORED`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The contract whose authority was replaced.

***

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The new authority's key, which the store refused.

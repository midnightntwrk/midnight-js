[**Midnight.js API Reference v5.0.0-rc.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-level-private-state-provider](../README.md) / StoredSigningKeyFormatError

# Class: StoredSigningKeyFormatError

Thrown when a signing key read from the store is neither a structured
`SigningKey` nor a key written by a 4.x client.

## Extends

- [`MidnightJsError`](../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new StoredSigningKeyFormatError**(`contractAddress`): `StoredSigningKeyFormatError`

#### Parameters

##### contractAddress

`string`

#### Returns

`StoredSigningKeyFormatError`

#### Overrides

[`MidnightJsError`](../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../midnight-js/classes/MidnightJsError.md).[`category`](../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_STORED_SIGNING_KEY_INVALID"` = `PROVIDER_ERROR_CODES.STORED_SIGNING_KEY_INVALID`

#### Overrides

[`MidnightJsError`](../../midnight-js/classes/MidnightJsError.md).[`code`](../../midnight-js/classes/MidnightJsError.md#code)

***

### contractAddress

> `readonly` **contractAddress**: `string`

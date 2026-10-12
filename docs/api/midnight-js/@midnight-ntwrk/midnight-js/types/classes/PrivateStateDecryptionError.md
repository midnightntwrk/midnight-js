[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateDecryptionError

# Class: PrivateStateDecryptionError

Stored private state could not be decrypted.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new PrivateStateDecryptionError**(`message`, `reason`, `options?`): `PrivateStateDecryptionError`

#### Parameters

##### message

`string`

##### reason

[`PrivateStateDecryptionReason`](../type-aliases/PrivateStateDecryptionReason.md)

##### options?

`ErrorOptions`

#### Returns

`PrivateStateDecryptionError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PRIVATE_STATE_DECRYPTION_FAILED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### reason

> `readonly` **reason**: [`PrivateStateDecryptionReason`](../type-aliases/PrivateStateDecryptionReason.md)

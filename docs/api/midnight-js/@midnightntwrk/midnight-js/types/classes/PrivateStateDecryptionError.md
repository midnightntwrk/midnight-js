[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateDecryptionError

# Class: PrivateStateDecryptionError

Stored private state could not be decrypted.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PRIVATE_STATE_DECRYPTION_FAILED"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### reason

> `readonly` **reason**: [`PrivateStateDecryptionReason`](../type-aliases/PrivateStateDecryptionReason.md)

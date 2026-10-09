[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / PrivateStateDecryptionError

# Class: PrivateStateDecryptionError

Stored private state could not be decrypted.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PRIVATE_STATE_DECRYPTION_FAILED"` = `PRIVATE_STATE_DECRYPTION_FAILED`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### reason

> `readonly` **reason**: [`PrivateStateDecryptionReason`](../type-aliases/PrivateStateDecryptionReason.md)

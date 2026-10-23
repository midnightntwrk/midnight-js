[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / PasswordValidationError

# Class: PasswordValidationError

Thrown when a password does not satisfy the strength policy applied to
private storage and export/import operations.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new PasswordValidationError**(`message`, `reason`): `PasswordValidationError`

#### Parameters

##### message

`string`

##### reason

[`PasswordValidationFailure`](../type-aliases/PasswordValidationFailure.md)

#### Returns

`PasswordValidationError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_PASSWORD_INVALID"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### reason

> `readonly` **reason**: [`PasswordValidationFailure`](../type-aliases/PasswordValidationFailure.md)

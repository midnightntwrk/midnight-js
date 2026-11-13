[**Midnight.js API Reference v5.0.1-rc.1**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ImportPasswordValidationError

# Class: ImportPasswordValidationError

Error thrown when the password supplied to an import does not satisfy the
password strength policy.

The failed check is kept on [passwordError](#passworderror): narrow it with
`instanceof PasswordValidationError` from `@midnight-ntwrk/midnight-js-utils`
and read its `reason`.

## Extends

- [`PrivateStateImportError`](PrivateStateImportError.md)

## Constructors

### Constructor

> **new ImportPasswordValidationError**(`passwordError`): `ImportPasswordValidationError`

#### Parameters

##### passwordError

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

#### Returns

`ImportPasswordValidationError`

#### Overrides

[`PrivateStateImportError`](PrivateStateImportError.md).[`constructor`](PrivateStateImportError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`PrivateStateImportError`](PrivateStateImportError.md).[`category`](PrivateStateImportError.md#category)

***

### cause?

> `readonly` `optional` **cause?**: [`PrivateStateImportErrorCause`](../type-aliases/PrivateStateImportErrorCause.md)

#### Inherited from

[`PrivateStateImportError`](PrivateStateImportError.md).[`cause`](PrivateStateImportError.md#cause)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_IMPORT_PASSWORD_INVALID"` = `IMPORT_PASSWORD_INVALID`

#### Overrides

[`PrivateStateImportError`](PrivateStateImportError.md).[`code`](PrivateStateImportError.md#code)

***

### passwordError

> `readonly` **passwordError**: [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateImportError

# Class: PrivateStateImportError

Base error thrown when importing private states fails.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Extended by

- [`ExportDecryptionError`](ExportDecryptionError.md)
- [`ImportConflictError`](ImportConflictError.md)
- [`ImportPasswordValidationError`](ImportPasswordValidationError.md)
- [`InvalidExportFormatError`](InvalidExportFormatError.md)

## Constructors

### Constructor

> **new PrivateStateImportError**(`message`, `cause?`): `PrivateStateImportError`

#### Parameters

##### message

`string`

##### cause?

[`PrivateStateImportErrorCause`](../type-aliases/PrivateStateImportErrorCause.md)

#### Returns

`PrivateStateImportError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### cause?

> `readonly` `optional` **cause?**: [`PrivateStateImportErrorCause`](../type-aliases/PrivateStateImportErrorCause.md)

#### Overrides

`MidnightJsError.cause`

***

### code

> `readonly` **code**: `PrivateStateImportErrorCode`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

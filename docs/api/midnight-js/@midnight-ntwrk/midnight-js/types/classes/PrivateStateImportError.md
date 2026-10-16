[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateImportError

# Class: PrivateStateImportError

Base error thrown when importing private states fails.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Extended by

- [`ExportDecryptionError`](ExportDecryptionError.md)
- [`ImportConflictError`](ImportConflictError.md)
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

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### cause?

> `readonly` `optional` **cause?**: [`PrivateStateImportErrorCause`](../type-aliases/PrivateStateImportErrorCause.md)

#### Overrides

`MidnightJsError.cause`

***

### code

> `readonly` **code**: `PrivateStateImportErrorCode`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

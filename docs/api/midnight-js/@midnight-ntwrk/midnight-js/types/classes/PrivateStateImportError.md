[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateImportError

# Class: PrivateStateImportError

Base error thrown when importing private states fails.

## Extends

- `Error`

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

`Error.constructor`

## Properties

### cause?

> `readonly` `optional` **cause?**: [`PrivateStateImportErrorCause`](../type-aliases/PrivateStateImportErrorCause.md)

#### Overrides

`Error.cause`

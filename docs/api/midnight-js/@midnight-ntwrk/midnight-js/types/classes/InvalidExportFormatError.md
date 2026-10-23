[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / InvalidExportFormatError

# Class: InvalidExportFormatError

Error thrown when the export data format is invalid.

## Extends

- [`PrivateStateImportError`](PrivateStateImportError.md)

## Constructors

### Constructor

> **new InvalidExportFormatError**(`message?`): `InvalidExportFormatError`

#### Parameters

##### message?

`string`

#### Returns

`InvalidExportFormatError`

#### Overrides

[`PrivateStateImportError`](PrivateStateImportError.md).[`constructor`](PrivateStateImportError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`PrivateStateImportError`](PrivateStateImportError.md).[`category`](PrivateStateImportError.md#category)

***

### cause?

> `readonly` `optional` **cause?**: [`PrivateStateImportErrorCause`](../type-aliases/PrivateStateImportErrorCause.md)

#### Inherited from

[`PrivateStateImportError`](PrivateStateImportError.md).[`cause`](PrivateStateImportError.md#cause)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INVALID_EXPORT_FORMAT"`

#### Overrides

[`PrivateStateImportError`](PrivateStateImportError.md).[`code`](PrivateStateImportError.md#code)

[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / PrivateStateImportError

# Class: PrivateStateImportError

Base error thrown when importing private states fails.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Extended by

- [`ExportDecryptionError`](ExportDecryptionError.md)
- [`InvalidExportFormatError`](InvalidExportFormatError.md)
- [`ImportConflictError`](ImportConflictError.md)

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

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### cause?

> `readonly` `optional` **cause?**: [`PrivateStateImportErrorCause`](../type-aliases/PrivateStateImportErrorCause.md)

#### Inherited from

`MidnightJsError.cause`

***

### code

> `readonly` **code**: `PrivateStateImportErrorCode` = `PRIVATE_STATE_IMPORT_FAILED`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

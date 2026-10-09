[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ExportDecryptionError

# Class: ExportDecryptionError

Error thrown when decryption of export data fails.
This could be due to wrong password, corrupted data, or tampered content.
The specific cause is intentionally not disclosed to prevent oracle attacks.

## Extends

- [`PrivateStateImportError`](PrivateStateImportError.md)

## Constructors

### Constructor

> **new ExportDecryptionError**(): `ExportDecryptionError`

#### Returns

`ExportDecryptionError`

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

> `readonly` **code**: `"MIDNIGHT_JS_PR_EXPORT_DECRYPTION_FAILED"`

#### Overrides

[`PrivateStateImportError`](PrivateStateImportError.md).[`code`](PrivateStateImportError.md#code)

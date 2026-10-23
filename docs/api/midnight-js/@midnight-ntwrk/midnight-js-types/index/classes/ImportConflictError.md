[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ImportConflictError

# Class: ImportConflictError

Error thrown when import conflicts with existing data and conflictStrategy is 'error'.

## Extends

- [`PrivateStateImportError`](PrivateStateImportError.md)

## Constructors

### Constructor

> **new ImportConflictError**(`conflictCount`, `entityName?`): `ImportConflictError`

#### Parameters

##### conflictCount

`number`

##### entityName?

`string` = `'private state'`

#### Returns

`ImportConflictError`

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

> `readonly` **code**: `"MIDNIGHT_JS_PR_IMPORT_CONFLICT"` = `IMPORT_CONFLICT`

#### Overrides

[`PrivateStateImportError`](PrivateStateImportError.md).[`code`](PrivateStateImportError.md#code)

***

### conflictCount

> `readonly` **conflictCount**: `number`

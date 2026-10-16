[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateStorageError

# Class: PrivateStateStorageError

Reading or writing the private-state store failed. `cause` is the failure; `closeError` is set when
closing the database afterwards failed too.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new PrivateStateStorageError**(`message`, `options?`): `PrivateStateStorageError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions` & `object`

#### Returns

`PrivateStateStorageError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### closeError?

> `readonly` `optional` **closeError?**: `unknown`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PRIVATE_STATE_STORAGE_FAILED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / PrivateStateStorageError

# Class: PrivateStateStorageError

Reading or writing the private-state store failed. `cause` is the failure; `closeError` is set when
closing the database afterwards failed too.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### closeError?

> `readonly` `optional` **closeError?**: `unknown`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_PRIVATE_STATE_STORAGE_FAILED"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

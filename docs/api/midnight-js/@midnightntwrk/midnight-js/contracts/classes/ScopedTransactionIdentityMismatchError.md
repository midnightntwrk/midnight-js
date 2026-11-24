[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ScopedTransactionIdentityMismatchError

# Class: ScopedTransactionIdentityMismatchError

An error indicating that a scoped transaction attempted to use cached states
with a different contract address or private state ID than the one originally cached.
This prevents silent state mismatches when batching calls to different contracts.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ScopedTransactionIdentityMismatchError**(`cached`, `requested`): `ScopedTransactionIdentityMismatchError`

#### Parameters

##### cached

###### contractAddress

`string`

###### privateStateId?

`string`

##### requested

###### contractAddress

`string`

###### privateStateId?

`string`

#### Returns

`ScopedTransactionIdentityMismatchError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### cached

> `readonly` **cached**: `object`

#### contractAddress

> **contractAddress**: `string`

#### privateStateId?

> `optional` **privateStateId?**: `string`

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_SCOPED_TRANSACTION_IDENTITY_MISMATCH"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### requested

> `readonly` **requested**: `object`

#### contractAddress

> **contractAddress**: `string`

#### privateStateId?

> `optional` **privateStateId?**: `string`

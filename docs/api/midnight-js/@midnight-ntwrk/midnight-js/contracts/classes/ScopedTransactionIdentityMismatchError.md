[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ScopedTransactionIdentityMismatchError

# Class: ScopedTransactionIdentityMismatchError

An error indicating that a scoped transaction attempted to use cached states
with a different contract address or private state ID than the one originally cached.
This prevents silent state mismatches when batching calls to different contracts.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

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

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### cached

> `readonly` **cached**: `object`

#### contractAddress

> **contractAddress**: `string`

#### privateStateId?

> `optional` **privateStateId?**: `string`

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_SCOPED_TX_IDENTITY_MISMATCH"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### requested

> `readonly` **requested**: `object`

#### contractAddress

> **contractAddress**: `string`

#### privateStateId?

> `optional` **privateStateId?**: `string`

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / ScopedTransactionIdentityMismatchError

# Class: ScopedTransactionIdentityMismatchError

An error indicating that a scoped transaction attempted to use cached states
with a different contract address or private state ID than the one originally cached.
This prevents silent state mismatches when batching calls to different contracts.

## Extends

- `Error`

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

`Error.constructor`

## Properties

### cached

> `readonly` **cached**: `object`

#### contractAddress

> **contractAddress**: `string`

#### privateStateId?

> `optional` **privateStateId?**: `string`

***

### requested

> `readonly` **requested**: `object`

#### contractAddress

> **contractAddress**: `string`

#### privateStateId?

> `optional` **privateStateId?**: `string`

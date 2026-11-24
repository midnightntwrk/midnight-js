[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / TransactionEraMismatchError

# Class: TransactionEraMismatchError

Thrown when a handle carries a transaction of another era than the one the
caller serves.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnightntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new TransactionEraMismatchError**(`expected`, `actual`): `TransactionEraMismatchError`

#### Parameters

##### expected

`"v8"` \| `"v9"`

The era the caller asked for.

##### actual

`"v8"` \| `"v9"`

The era the handle carries.

#### Returns

`TransactionEraMismatchError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### actual

> `readonly` **actual**: `"v8"` \| `"v9"`

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_TRANSACTION_ERA_MISMATCH"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### expected

> `readonly` **expected**: `"v8"` \| `"v9"`

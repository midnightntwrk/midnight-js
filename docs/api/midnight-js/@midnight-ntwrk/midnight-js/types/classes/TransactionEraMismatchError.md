[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / TransactionEraMismatchError

# Class: TransactionEraMismatchError

Thrown by `LedgerTransaction.unwrap` when the handle carries a transaction of
another era than the one asked for.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

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

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### actual

> `readonly` **actual**: `"v8"` \| `"v9"`

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_TRANSACTION_ERA_MISMATCH"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### expected

> `readonly` **expected**: `"v8"` \| `"v9"`

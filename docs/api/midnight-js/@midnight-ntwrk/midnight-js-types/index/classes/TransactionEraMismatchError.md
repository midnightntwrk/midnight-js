[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / TransactionEraMismatchError

# Class: TransactionEraMismatchError

Thrown by `LedgerTransaction.unwrap` when the handle carries a transaction of
another era than the one asked for.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### actual

> `readonly` **actual**: `"v8"` \| `"v9"`

The era the handle carries.

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_TRANSACTION_ERA_MISMATCH"` = `TRANSACTION_ERA_MISMATCH`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### expected

> `readonly` **expected**: `"v8"` \| `"v9"`

The era the caller asked for.

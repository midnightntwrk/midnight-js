[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / InvalidTransactionHandleError

# Class: InvalidTransactionHandleError

Thrown when a value reaching a method that takes a transaction handle is not
a usable one, or when `LedgerTransaction.seal` is given a value it cannot
seal at the stage it is asked for.

The types rule these values out, so it is reachable only from JavaScript,
across an untyped boundary, or from a second copy of this package.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new InvalidTransactionHandleError**(`method`, `reason`, `detail`): `InvalidTransactionHandleError`

#### Parameters

##### method

[`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md)

The method the value reached.

##### reason

[`InvalidTransactionHandleReason`](../type-aliases/InvalidTransactionHandleReason.md)

Why the value was refused.

##### detail

`string`

What arrived, for the message only, for example `'null'` or
              `'an object'`. Never the value's contents.

#### Returns

`InvalidTransactionHandleError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INVALID_TRANSACTION_HANDLE"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### detail

> `readonly` **detail**: `string`

***

### method

> `readonly` **method**: [`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md)

***

### reason

> `readonly` **reason**: [`InvalidTransactionHandleReason`](../type-aliases/InvalidTransactionHandleReason.md)

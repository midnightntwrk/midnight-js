[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ForeignLedgerTransactionError

# Class: ForeignLedgerTransactionError

Thrown by `LedgerTransaction.seal` when the transaction object is not one of
the ledger copy this framework loaded for its era.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ForeignLedgerTransactionError**(`era`, `reason`, `method?`): `ForeignLedgerTransactionError`

#### Parameters

##### era

`"v8"` \| `"v9"`

The era the object was sealed as.

##### reason

[`ForeignLedgerTransactionReason`](../type-aliases/ForeignLedgerTransactionReason.md)

Why the object was refused.

##### method?

[`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md)

The provider method whose answer was sealed, or
              `LedgerTransaction.seal` when it was sealed directly.

#### Returns

`ForeignLedgerTransactionError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

***

### method

> `readonly` **method**: [`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md)

***

### reason

> `readonly` **reason**: [`ForeignLedgerTransactionReason`](../type-aliases/ForeignLedgerTransactionReason.md)

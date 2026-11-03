[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ForeignLedgerTransactionError

# Class: ForeignLedgerTransactionError

Thrown by `LedgerTransaction.seal` when the transaction object is not one of
the ledger copy this framework loaded for its era.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

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

[`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md) = `'LedgerTransaction.seal'`

The provider method whose answer was sealed, or
              `LedgerTransaction.seal` when it was sealed directly.

#### Returns

`ForeignLedgerTransactionError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION"` = `FOREIGN_LEDGER_TRANSACTION`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

The era the object was sealed as.

***

### method

> `readonly` **method**: [`TransactionHandleMethod`](../type-aliases/TransactionHandleMethod.md) = `'LedgerTransaction.seal'`

The provider method whose answer was sealed, or
              `LedgerTransaction.seal` when it was sealed directly.

***

### reason

> `readonly` **reason**: [`ForeignLedgerTransactionReason`](../type-aliases/ForeignLedgerTransactionReason.md)

Why the object was refused.

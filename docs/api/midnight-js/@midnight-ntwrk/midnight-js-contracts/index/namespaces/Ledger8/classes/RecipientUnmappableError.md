[**Midnight.js API Reference v5.0.0-rc.4**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / RecipientUnmappableError

# Class: RecipientUnmappableError

Everything the RETAINED era publishes, under one name.

The barrel re-exports this module as `Ledger8`, so a caller writes
`Ledger8.FoundContract<C>` and `Ledger8.CallTxFailedError`. The era prefix is
dropped inside, because the namespace already carries it -- so a declaration
this reference calls `Ledger8X` is the member published as `Ledger8.X`.

Membership is the retained era's own family: its contract and result types,
its interface factory, and the refusals its pipeline raises. Names that serve
BOTH eras stay on the flat surface, so a consumer that only receives results
never imports the transitional half.

## See

[RetainedEraNamespace](../../../../documents/RetainedEraNamespace.md) for what qualifies, what stays flat, and
     how the surface is withdrawn.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new RecipientUnmappableError**(`circuitId`, `recipientCoinPublicKey`): `Ledger8RecipientUnmappableError`

#### Parameters

##### circuitId

`string`

##### recipientCoinPublicKey

`string`

#### Returns

`Ledger8RecipientUnmappableError`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../../../midnight-js/classes/MidnightJsError.md#category)

***

### circuitId

> `readonly` **circuitId**: `string`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_RECIPIENT_UNMAPPABLE"` = `CONTRACTS_ERROR_CODES.LEDGER8_RECIPIENT_UNMAPPABLE`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

***

### recipientCoinPublicKey

> `readonly` **recipientCoinPublicKey**: `string`

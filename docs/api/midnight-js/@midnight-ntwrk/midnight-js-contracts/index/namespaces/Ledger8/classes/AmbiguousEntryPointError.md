[**Midnight.js API Reference v5.0.0-rc.4**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / AmbiguousEntryPointError

# Class: AmbiguousEntryPointError

An error indicating that the fetched contract state declares the same entry
point NAME more than once, so which slot a call would dispatch on is
ambiguous.

Two byte entry points can decode to the same name. Picking the first match
would let the pre-proving key check pass against one slot while the chain
dispatches the proof on another, which is a paid-for proof rejected at
submission — the exact late failure that check exists to prevent.

It reports a chain state this package cannot act on, and there is no remediation a caller can apply
beyond reporting it.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new AmbiguousEntryPointError**(`circuitId`, `matchCount`): `Ledger8AmbiguousEntryPointError`

#### Parameters

##### circuitId

`string`

##### matchCount

`number`

#### Returns

`Ledger8AmbiguousEntryPointError`

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

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_AMBIGUOUS_ENTRY_POINT"` = `CONTRACTS_ERROR_CODES.LEDGER8_AMBIGUOUS_ENTRY_POINT`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

***

### matchCount

> `readonly` **matchCount**: `number`

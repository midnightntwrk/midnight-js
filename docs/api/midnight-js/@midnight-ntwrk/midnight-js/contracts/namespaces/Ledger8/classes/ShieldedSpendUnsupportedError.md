[**Midnight.js API Reference v5.0.0-rc.4**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / ShieldedSpendUnsupportedError

# Class: ShieldedSpendUnsupportedError

An error indicating that a retained-era call would spend a shielded coin the
contract already holds on chain, which this pipeline structurally cannot
compose.

A coin the same call produced is NOT refused: it is paired with its own
output as a transient and needs no chain state. Only spends of previously
held coins are.

## See

[ErrorTaxonomy](../../../../documents/ErrorTaxonomy.md) for what the retained arm is missing and why this
refuses before the offer is built.

## Extends

- [`MidnightJsError`](../../../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ShieldedSpendUnsupportedError**(`circuitId`): `Ledger8ShieldedSpendUnsupportedError`

#### Parameters

##### circuitId

`string`

The circuit whose call was refused.

#### Returns

`Ledger8ShieldedSpendUnsupportedError`

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`constructor`](../../../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`category`](../../../../classes/MidnightJsError.md#category)

***

### circuitId

> `readonly` **circuitId**: `string`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SHIELDED_SPEND_UNSUPPORTED"`

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`code`](../../../../classes/MidnightJsError.md#code)

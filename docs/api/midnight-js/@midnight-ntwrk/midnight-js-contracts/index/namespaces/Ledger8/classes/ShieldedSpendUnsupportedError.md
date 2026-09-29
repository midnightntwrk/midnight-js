[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ShieldedSpendUnsupportedError

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

- `Error`

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

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

The circuit whose call was refused.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SHIELDED_SPEND_UNSUPPORTED"` = `CONTRACTS_ERROR_CODES.LEDGER8_SHIELDED_SPEND_UNSUPPORTED`

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / AmbiguousEntryPointError

# Class: AmbiguousEntryPointError

An error indicating that the fetched contract state declares the same entry
point NAME more than once, so which slot a call would dispatch on is
ambiguous.

Two byte entry points can decode to the same name. Picking the first match
would let the pre-proving key check pass against one slot while the chain
dispatches the proof on another, which is a paid-for proof rejected at
submission — the exact late failure that check exists to prevent.

Carries no registered error code: it reports a chain state this package
cannot act on, and there is no remediation a caller can apply beyond
reporting it.

## Extends

- `Error`

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

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### matchCount

> `readonly` **matchCount**: `number`

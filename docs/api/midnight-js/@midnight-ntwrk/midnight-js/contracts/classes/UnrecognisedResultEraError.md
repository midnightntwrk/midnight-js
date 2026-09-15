[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnrecognisedResultEraError

# Class: UnrecognisedResultEraError

An era tag on a result that names neither pipeline.

[isLedger8Result](../variables/isLedger8Result.md) refuses rather than answering `false`. Answering
`false` would mean "this is a current-era result", which for an unreadable
tag is a guess, and the caller would then read the result through the wrong
era's shape. Every result this framework builds carries one of the two
literals; a value that does not has been round-tripped through something
that dropped it -- a queue, a JSON boundary, a structured clone.

## Extends

- `Error`

## Constructors

### Constructor

> **new UnrecognisedResultEraError**(`received`): `UnrecognisedResultEraError`

#### Parameters

##### received

`unknown`

What the result's `era` field actually held.

#### Returns

`UnrecognisedResultEraError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_UNRECOGNISED_RESULT_ERA"`

***

### received

> `readonly` **received**: `unknown`

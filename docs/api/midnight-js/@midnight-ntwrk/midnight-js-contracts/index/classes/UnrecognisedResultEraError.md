[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / UnrecognisedResultEraError

# Class: UnrecognisedResultEraError

An era tag on a result that names neither pipeline.

[isLedger8Result](../functions/isLedger8Result.md) refuses rather than answering `false`. Answering
`false` would mean "this is a current-era result", which for an unreadable
tag is a guess, and the caller would then read the result through the wrong
era's shape. Every result this framework builds carries one of the two
literals; a value that does not has been round-tripped through something
that dropped it -- a queue, a JSON boundary, a structured clone.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_UNRECOGNISED_RESULT_ERA"` = `CONTRACTS_ERROR_CODES.UNRECOGNISED_RESULT_ERA`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

***

### received

> `readonly` **received**: `unknown`

What the result's `era` field actually held.

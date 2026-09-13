[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / PayloadNotATransactionError

# Class: PayloadNotATransactionError

Thrown when a payload handed to a proving seam is not a serialized
transaction at all.

Distinct from a decode failure inside the ledger runtime: this is raised
before any runtime is asked to read the bytes, so it says the caller sent the
wrong KIND of payload rather than a damaged one. It covers three ways that
can happen — a `txBytes` field that is not a byte string, a byte string
shorter than the tag prefix, and one that does not open with the prefix.

## Remarks

Raised by `proveV8Transaction`, so it reaches application code as a
`proveTx` rejection. Match it with `hasErrorCode` against
`PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION` rather than constructing it.

## Extends

- `Error`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_PAYLOAD_NOT_A_TRANSACTION"` = `PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION`

## Methods

### notBytes()

> `static` **notBytes**(`received`): `PayloadNotATransactionError`

The `txBytes` field of a `v8` payload was not a `Uint8Array`. Reachable
from JavaScript, from a consumer built against a pre-5.0.0
`midnight-js-types`, or across an untyped boundary — so it is refused with
a code rather than left to become a bare `TypeError`.

#### Parameters

##### received

`unknown`

#### Returns

`PayloadNotATransactionError`

***

### wrongTag()

> `static` **wrongTag**(`byteLength`): `PayloadNotATransactionError`

The payload is a byte string, but does not open with a transaction's tag.

#### Parameters

##### byteLength

`number`

#### Returns

`PayloadNotATransactionError`

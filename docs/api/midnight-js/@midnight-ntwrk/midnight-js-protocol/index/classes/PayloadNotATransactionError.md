[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / PayloadNotATransactionError

# Class: PayloadNotATransactionError

Thrown when a payload handed to `deserializeTransactionAtStage` is not a
serialized transaction of the requested era and stage.

It covers four ways that can happen: a value that is not a byte string, a
byte string shorter than the tag prefix, one that does not open with the
prefix, and one the era's runtime refuses to read at the requested stage.
The first three are refused before any runtime reads the bytes. The last
carries the runtime's refusal on `cause`.

## Remarks

Match it with `hasErrorCode` against
`PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION` rather than constructing it.

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_PAYLOAD_NOT_A_TRANSACTION"` = `PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

## Methods

### notBytes()

> `static` **notBytes**(`received`): `PayloadNotATransactionError`

The payload was not a `Uint8Array`. Reachable from JavaScript or across an
untyped boundary, so it is refused with a code rather than left to become
a bare `TypeError`.

#### Parameters

##### received

`unknown`

#### Returns

`PayloadNotATransactionError`

***

### undecodable()

> `static` **undecodable**(`version`, `stage`, `byteLength`, `cause`): `PayloadNotATransactionError`

The era's runtime refused to read the payload at the requested stage; its refusal is on `cause`.

#### Parameters

##### version

`"v8"` \| `"v9"`

##### stage

`TransactionStage`

##### byteLength

`number`

##### cause

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

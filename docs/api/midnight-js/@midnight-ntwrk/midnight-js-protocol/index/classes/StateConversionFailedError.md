[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / StateConversionFailedError

# Class: StateConversionFailedError

Thrown when a serialized contract state, or an already-extracted
`EncodedStateValue`, cannot be turned into a state a circuit can execute
against. Raised by `extractLedger9EncodedStateValue` (`lib/era/envelope.ts`)
and by `decodeExecutableStateValue` (`lib/v8/executable.ts`), which refuses a
state that decodes but does not re-encode to the bytes it came from.

Renders no raw hex and no decoded state contents — only the stage name and
the wrapped `cause`.

## Param

**stage**

Which step failed — see [StateConversionStage](../type-aliases/StateConversionStage.md).

## Param

**cause**

The runtime's own failure, preserved unchanged. It is what
  distinguishes a tag mismatch from truncated, trailing, or empty input.

## See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new StateConversionFailedError**(`stage`, `cause`): `StateConversionFailedError`

#### Parameters

##### stage

[`StateConversionStage`](../type-aliases/StateConversionStage.md)

##### cause

`unknown`

#### Returns

`StateConversionFailedError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_STATE_CONVERSION_FAILED"` = `PROTOCOL_ERROR_CODES.STATE_CONVERSION_FAILED`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

***

### stage

> `readonly` **stage**: [`StateConversionStage`](../type-aliases/StateConversionStage.md)

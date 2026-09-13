[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / DownConvertFailedError

# Class: DownConvertFailedError

Thrown by the down-convert engine (`lib/era/envelope.ts`,
`lib/v8/down-convert.ts`) when it cannot turn a raw contract-state
envelope, or an already-extracted `EncodedStateValue`, into an executable
pre-fork state. Raised by `extractV9EncodedStateValue` (`lib/era/envelope.ts`)
and `downConvertForExecution` (`lib/v8/down-convert.ts`).

Renders no raw hex and no decoded state contents — only the stage name and
the wrapped `cause`.

## Param

**stage**

Which step failed — see [DownConvertStage](../type-aliases/DownConvertStage.md).

## Param

**cause**

The runtime's own failure, preserved unchanged. It is what
  distinguishes a tag mismatch from truncated, trailing, or empty input.

## See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)

## Extends

- `Error`

## Constructors

### Constructor

> **new DownConvertFailedError**(`stage`, `cause`): `DownConvertFailedError`

#### Parameters

##### stage

[`DownConvertStage`](../type-aliases/DownConvertStage.md)

##### cause

`unknown`

#### Returns

`DownConvertFailedError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_DOWN_CONVERT_FAILED"` = `PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED`

***

### stage

> `readonly` **stage**: [`DownConvertStage`](../type-aliases/DownConvertStage.md)

[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / StateDecodeFailedError

# Class: StateDecodeFailedError

Thrown when a raw, serialized contract-state envelope could not be read by
the ledger era it was requested for. Raised by both of the facade's read
paths, `extractState` and `decodeContractState`
(`lib/shared/contract-state.ts`), so a caller writes one handler for both.

Renders no hex and no byte dump of its own.

## Param

**version**

The era whose decoder rejected the envelope.

## Param

**cause**

The decoder's own diagnosis, preserved unchanged. It is what
  distinguishes a tag mismatch from truncated, trailing or empty input.

## See

FailClosedDecoding

## Extends

- `Error`

## Constructors

### Constructor

> **new StateDecodeFailedError**(`version`, `cause`): `StateDecodeFailedError`

#### Parameters

##### version

`"v8"` \| `"v9"`

##### cause

`unknown`

#### Returns

`StateDecodeFailedError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_STATE_DECODE_FAILED"`

***

### version

> `readonly` **version**: `"v8"` \| `"v9"`

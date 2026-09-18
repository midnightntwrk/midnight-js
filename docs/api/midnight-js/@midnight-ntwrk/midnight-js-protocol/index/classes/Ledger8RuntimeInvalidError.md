[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8RuntimeInvalidError

# Class: Ledger8RuntimeInvalidError

Thrown by `extractEncodedStateValue` (`lib/era/envelope.ts`) when the
injected pre-fork runtime cannot be used — it was not passed at all, or the
binding the decoder needs is absent from it. Also raised by
`downConvertForExecution` (`lib/v8/down-convert.ts`) and
`assertSharedLedger8Instance` (`lib/v8/instance-guard.ts`), the latter for a
nullish instance probe.

Nothing is wrong with the caller's input here. Distinct from
[Ledger8RuntimeMissingError](Ledger8RuntimeMissingError.md), which reports the v8 chunk failing to
load at all, and from [DownConvertFailedError](DownConvertFailedError.md), which reports an
envelope or state that could not be turned into an executable pre-fork
state.

## Param

**missingMember**

Which binding was absent. One of this module's own
  literals, never caller-supplied text, so it is safe to log.

## See

 - [FailClosedDecoding](../../documents/FailClosedDecoding.md)
 - [DualInstantiationGuard](../../documents/DualInstantiationGuard.md)

## Extends

- `Error`

## Constructors

### Constructor

> **new Ledger8RuntimeInvalidError**(`missingMember`): `Ledger8RuntimeInvalidError`

#### Parameters

##### missingMember

`string`

#### Returns

`Ledger8RuntimeInvalidError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_LEDGER8_RUNTIME_INVALID"` = `PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID`

***

### missingMember

> `readonly` **missingMember**: `string`

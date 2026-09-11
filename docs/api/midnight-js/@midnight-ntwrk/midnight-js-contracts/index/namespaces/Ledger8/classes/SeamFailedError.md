[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / SeamFailedError

# Class: SeamFailedError

An error indicating that a provider rejected a retained-era transaction at
one of the three transaction-flow seams, with the provider's own failure
SANITIZED onto `cause`.

## Why the external failure does not travel as-is

A proof-server HTTP failure and a node submit rejection both routinely carry
payload material: a response body echoing the request, a message quoting the
serialized transaction, or vendor-specific own properties holding either.
Propagating such an error unchanged puts that material into whatever the
caller logs it with. So the cause is rebuilt here as a plain Error
carrying the original's CLASS NAME and a redacted message, and nothing else:
no own properties, and no further `cause` chain.

This package's own coded errors are NOT wrapped: they carry no external
payload, and a caller narrowing on `V8PayloadUnsupportedError` or
[EraInvariantViolationError](../../../classes/EraInvariantViolationError.md) must keep seeing them.

## See

[KeepStatePipeline](../../../../documents/KeepStatePipeline.md) for what redaction removes and what is dropped.

## Extends

- `Error`

## Constructors

### Constructor

> **new SeamFailedError**(`seam`, `circuitId`, `cause`): `Ledger8SeamFailedError`

#### Parameters

##### seam

[`Seam`](../../../../../midnight-js/types/type-aliases/Seam.md)

The provider method that rejected.

##### circuitId

`string`

The circuit this flow was running.

##### cause

`Error`

The provider's failure, already sanitized by the caller.

#### Returns

`Ledger8SeamFailedError`

#### Overrides

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

The circuit this flow was running.

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_SEAM_FAILED"` = `CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED`

***

### seam

> `readonly` **seam**: [`Seam`](../../../../../midnight-js/types/type-aliases/Seam.md)

The provider method that rejected.

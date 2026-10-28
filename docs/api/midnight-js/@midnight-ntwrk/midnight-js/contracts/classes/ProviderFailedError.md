[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ProviderFailedError

# Class: ProviderFailedError

An error indicating that a provider rejected a transaction at one of the
three transaction methods, with the provider's own failure SANITIZED onto
`cause`. Raised on every submit path, whatever era the transaction belongs to.

## Why the external failure does not travel as-is

A proof-server HTTP failure and a node submit rejection both routinely carry
payload material: a response body echoing the request, a message quoting the
serialized transaction, or vendor-specific own properties holding either.
Propagating such an error unchanged puts that material into whatever the
caller logs it with. So the cause is rebuilt here as a plain Error
carrying the original's CLASS NAME and a redacted message, and nothing else:
no own properties, and no further `cause` chain.

This package's own coded errors are NOT wrapped: they carry no external
payload, and a caller narrowing on `ProviderEraUnsupportedError`,
`InvalidTransactionHandleError` or [EraInvariantViolationError](EraInvariantViolationError.md) must keep seeing them.

## See

[KeepStatePipeline](../../documents/KeepStatePipeline.md) for what redaction removes and what is dropped.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ProviderFailedError**(`method`, `circuitId`, `cause`): `ProviderFailedError`

#### Parameters

##### method

[`ProviderMethod`](../../types/type-aliases/ProviderMethod.md)

The provider method that rejected.

##### circuitId

`string` \| readonly `string`[] \| `undefined`

The circuit, or circuits, the transaction runs, when known.

##### cause

`Error`

The provider's failure, already sanitized by the caller.

#### Returns

`ProviderFailedError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### circuitId

> `readonly` **circuitId**: `string` \| readonly `string`[] \| `undefined`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_PROVIDER_FAILED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### method

> `readonly` **method**: [`ProviderMethod`](../../types/type-aliases/ProviderMethod.md)

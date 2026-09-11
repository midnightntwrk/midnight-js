[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ScopedTxEraUnsupportedError

# Class: ScopedTxEraUnsupportedError

An error indicating that a contract-scoped transaction was created while the
network head is on a ledger era that has no way to express one.

The pre-fork era composes exactly one call per transaction, which leaves a
pre-fork scope nothing to batch into.

Raised when the scope is CREATED, and from the head READING alone — before
that era's runtime is acquired. Both are load-bearing; do not move it later.

Both ways forward are named in the message, because the caller's batching
intent cannot be honoured either way and it needs to choose.

## See

[StaleHeadRemediation](../../documents/StaleHeadRemediation.md) for what each placement property prevents.

## Extends

- `Error`

## Constructors

### Constructor

> **new ScopedTxEraUnsupportedError**(`head`): `ScopedTxEraUnsupportedError`

#### Parameters

##### head

`"v8"` \| `"v9"`

The era the network head is on, as the scope resolved it.

#### Returns

`ScopedTxEraUnsupportedError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_SCOPED_TX_ERA_UNSUPPORTED"`

***

### head

> `readonly` **head**: `"v8"` \| `"v9"`

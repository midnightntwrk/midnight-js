[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ScopedTransactionEraUnsupportedError

# Class: ScopedTransactionEraUnsupportedError

An error indicating that a contract-scoped transaction was created while the
network is on a ledger era that has no way to express one.

The pre-fork era composes exactly one call per transaction, which leaves a
pre-fork scope nothing to batch into. The message names both ways forward,
because the caller's batching intent cannot be honoured either way.

Raised when the scope is CREATED, and from the network version READING alone — before
that era's runtime is acquired. Both are load-bearing; do not move it later.

## See

 - [ErrorTaxonomy](../../documents/ErrorTaxonomy.md) for the refuse-before-you-pay placement rule.
 - [ForkCrossedRemediation](../../documents/ForkCrossedRemediation.md) for what each placement property prevents.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new ScopedTransactionEraUnsupportedError**(`networkVersion`): `ScopedTransactionEraUnsupportedError`

#### Parameters

##### networkVersion

`"v8"` \| `"v9"`

The ledger version the network is on, as the scope resolved it.

#### Returns

`ScopedTransactionEraUnsupportedError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_SCOPED_TRANSACTION_ERA_UNSUPPORTED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### networkVersion

> `readonly` **networkVersion**: `"v8"` \| `"v9"`

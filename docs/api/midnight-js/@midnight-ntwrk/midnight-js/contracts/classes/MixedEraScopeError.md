[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / MixedEraScopeError

# Class: MixedEraScopeError

An error indicating that a call against a contract produced by the RETAINED
Compact toolchain was handed a contract-scoped transaction to join.

A scope merges live CURRENT-era transactions, and a retained-era call crosses
the provider seams as its own transaction, so there is nothing to merge it
into at either head.

Raised rather than ignored, and that is the change it makes: the retained-era
arm previously accepted a scope context and ran outside it.

## See

[StaleHeadRemediation](../../documents/StaleHeadRemediation.md) for why the two cannot be batched.

## Extends

- `Error`

## Constructors

### Constructor

> **new MixedEraScopeError**(`circuitId`): `MixedEraScopeError`

#### Parameters

##### circuitId

`string`

The circuit whose call was refused.

#### Returns

`MixedEraScopeError`

#### Overrides

`Error.constructor`

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_MIXED_ERA_SCOPE"`

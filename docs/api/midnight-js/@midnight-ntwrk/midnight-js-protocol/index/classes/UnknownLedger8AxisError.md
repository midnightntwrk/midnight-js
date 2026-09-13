[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / UnknownLedger8AxisError

# Class: UnknownLedger8AxisError

Thrown by `assertSharedLedger8Instance` (`lib/v8/instance-guard.ts`)
when the `axis` it was handed is not a member of [Ledger8InstanceAxis](../type-aliases/Ledger8InstanceAxis.md).

A TypeScript caller cannot produce this — `axis` is typed as
[Ledger8InstanceAxis](../type-aliases/Ledger8InstanceAxis.md). It exists for the untyped JavaScript consumers
this package also serves.

## Param

**requestedAxis**

The offending value that was passed. Carried for
  programmatic use only; it is deliberately kept out of the message.

## See

[DualInstantiationGuard](../../documents/DualInstantiationGuard.md)

## Extends

- `Error`

## Constructors

### Constructor

> **new UnknownLedger8AxisError**(`requestedAxis`): `UnknownLedger8AxisError`

#### Parameters

##### requestedAxis

`string`

#### Returns

`UnknownLedger8AxisError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS"` = `PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER8_AXIS`

***

### requestedAxis

> `readonly` **requestedAxis**: `string`

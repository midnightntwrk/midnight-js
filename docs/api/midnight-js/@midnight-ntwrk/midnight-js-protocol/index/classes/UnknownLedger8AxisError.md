[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / UnknownLedger8AxisError

# Class: UnknownLedger8AxisError

Raised when a shared-instance guard is handed an `axis` that is not a member
of [Ledger8InstanceAxis](../type-aliases/Ledger8InstanceAxis.md).

NOTHING RAISES THIS ANY MORE: the guard it served
(`lib/v8/instance-guard.ts`) was removed with the hand-maintained execution
layer — see [Ledger8InstanceAxis](../type-aliases/Ledger8InstanceAxis.md). It is kept on the published surface,
with its code, rather than removed from a consumer's error taxonomy as a side
effect of an internal refactor.

## Param

**requestedAxis**

The offending value that was passed. Carried for
  programmatic use only; it is deliberately kept out of the message.

## See

[DualInstantiationGuard](../../documents/DualInstantiationGuard.md)

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new UnknownLedger8AxisError**(`requestedAxis`): `UnknownLedger8AxisError`

#### Parameters

##### requestedAxis

`string`

#### Returns

`UnknownLedger8AxisError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS"` = `PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER8_AXIS`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

***

### requestedAxis

> `readonly` **requestedAxis**: `string`

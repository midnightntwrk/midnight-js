[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8InstanceMismatchError

# Class: Ledger8InstanceMismatchError

Thrown by `assertSharedLedger8Instance` (`lib/v8/instance-guard.ts`)
when the same-named WASM package resolved to two physically distinct copies
in this process (a dual-instantiation).

Carries no `cause`: this is a direct reference-equality assertion failure,
not a wrapped lower-level exception.

## Param

**axis**

Which physical-copy axis the check ran on — see
  [Ledger8InstanceAxis](../type-aliases/Ledger8InstanceAxis.md). It also selects the package names the
  message tells the reader to trace.

## See

[DualInstantiationGuard](../../documents/DualInstantiationGuard.md)

## Extends

- `Error`

## Constructors

### Constructor

> **new Ledger8InstanceMismatchError**(`axis`): `Ledger8InstanceMismatchError`

#### Parameters

##### axis

`"onchain-runtime-v3"`

#### Returns

`Ledger8InstanceMismatchError`

#### Overrides

`Error.constructor`

## Properties

### axis

> `readonly` **axis**: `"onchain-runtime-v3"`

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH"` = `PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH`

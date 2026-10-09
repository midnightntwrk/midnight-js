[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8InstanceMismatchError

# Class: Ledger8InstanceMismatchError

Raised when the same-named WASM package resolves to two physically distinct
copies in this process (a dual-instantiation).

See [Ledger8InstanceAxis](../type-aliases/Ledger8InstanceAxis.md) for why nothing in this package raises it any
more, and what holds the invariant instead.

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

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new Ledger8InstanceMismatchError**(`axis`): `Ledger8InstanceMismatchError`

#### Parameters

##### axis

`"onchain-runtime-v3"`

#### Returns

`Ledger8InstanceMismatchError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### axis

> `readonly` **axis**: `"onchain-runtime-v3"`

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH"` = `PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

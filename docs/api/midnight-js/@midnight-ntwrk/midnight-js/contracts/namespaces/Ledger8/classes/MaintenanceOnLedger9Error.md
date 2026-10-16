[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / MaintenanceOnLedger9Error

# Class: MaintenanceOnLedger9Error

An error indicating that a contract MAINTENANCE update was given a contract produced by the
retained Compact toolchain while the network head has already crossed the fork.

The retained era maintains contracts only before the fork. After it, the same contract is
maintained through the same functions with the artifact recompiled by the current toolchain, and
with the signing key already stored for its address.

## Extends

- [`MidnightJsError`](../../../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new MaintenanceOnLedger9Error**(): `Ledger8MaintenanceOnLedger9Error`

#### Returns

`Ledger8MaintenanceOnLedger9Error`

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`constructor`](../../../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`category`](../../../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_MAINTENANCE_ON_LEDGER9"`

#### Overrides

[`MidnightJsError`](../../../../classes/MidnightJsError.md).[`code`](../../../../classes/MidnightJsError.md#code)

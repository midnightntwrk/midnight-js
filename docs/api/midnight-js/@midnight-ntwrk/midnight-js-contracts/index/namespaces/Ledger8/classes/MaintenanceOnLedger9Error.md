[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / MaintenanceOnLedger9Error

# Class: MaintenanceOnLedger9Error

An error indicating that a contract MAINTENANCE update was given a contract produced by the
retained Compact toolchain while the network head has already crossed the fork.

The retained era maintains contracts only before the fork. After it, the same contract is
maintained through the same functions with the artifact recompiled by the current toolchain, and
with the signing key already stored for its address.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new MaintenanceOnLedger9Error**(): `Ledger8MaintenanceOnLedger9Error`

#### Returns

`Ledger8MaintenanceOnLedger9Error`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_MAINTENANCE_ON_LEDGER9"` = `CONTRACTS_ERROR_CODES.LEDGER8_MAINTENANCE_ON_LEDGER9`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

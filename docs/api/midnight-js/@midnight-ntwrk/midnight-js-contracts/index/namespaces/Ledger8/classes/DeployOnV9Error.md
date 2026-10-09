[**Midnight.js API Reference v5.0.0-rc.4**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployOnV9Error

# Class: DeployOnV9Error

An error indicating that a contract produced by the retained Compact toolchain was submitted for
DEPLOYMENT to a network head that has already crossed the fork.

The retained era is supported for calls against contracts already on chain, which is what keeps
pre-fork deployments callable. A new deployment has no such history to preserve, so it is refused
rather than written to the chain in an era the network has left.

## Extends

- [`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new DeployOnV9Error**(): `Ledger8DeployOnV9Error`

#### Returns

`Ledger8DeployOnV9Error`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9"` = `CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9`

#### Overrides

[`MidnightJsError`](../../../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../../../midnight-js/classes/MidnightJsError.md#code)

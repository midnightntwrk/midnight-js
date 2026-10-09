[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / IncompleteFindContractPrivateStateConfig

# Class: IncompleteFindContractPrivateStateConfig

An error indicating that an initial private state was specified for a contract find while a
private state ID was not. We can't store the initial private state if we don't have a private state ID,
and we need to let the user know that.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new IncompleteFindContractPrivateStateConfig**(): `IncompleteFindContractPrivateStateConfig`

#### Returns

`IncompleteFindContractPrivateStateConfig`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_INCOMPLETE_FIND_PRIVATE_STATE_CONFIG"` = `CONTRACTS_ERROR_CODES.INCOMPLETE_FIND_PRIVATE_STATE_CONFIG`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

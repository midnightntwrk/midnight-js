[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / IncompleteCallTxPrivateStateConfig

# Class: IncompleteCallTxPrivateStateConfig

An error indicating that a private state ID was specified for a call transaction while a private
state provider was not. We want to let the user know so that they aren't under the impression the
private state of a contract was updated when it wasn't.

## Extends

- [`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new IncompleteCallTxPrivateStateConfig**(): `IncompleteCallTxPrivateStateConfig`

#### Returns

`IncompleteCallTxPrivateStateConfig`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`category`](../../../midnight-js/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG"` = `CONTRACTS_ERROR_CODES.INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG`

#### Overrides

[`MidnightJsError`](../../../midnight-js/classes/MidnightJsError.md).[`code`](../../../midnight-js/classes/MidnightJsError.md#code)

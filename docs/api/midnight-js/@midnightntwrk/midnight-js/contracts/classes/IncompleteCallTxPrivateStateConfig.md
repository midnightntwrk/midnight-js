[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / IncompleteCallTxPrivateStateConfig

# Class: IncompleteCallTxPrivateStateConfig

An error indicating that a private state ID was specified for a call transaction while a private
state provider was not. We want to let the user know so that they aren't under the impression the
private state of a contract was updated when it wasn't.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new IncompleteCallTxPrivateStateConfig**(): `IncompleteCallTxPrivateStateConfig`

#### Returns

`IncompleteCallTxPrivateStateConfig`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / IncompleteFindContractPrivateStateConfig

# Class: IncompleteFindContractPrivateStateConfig

An error indicating that an initial private state was specified for a contract find while a
private state ID was not. We can't store the initial private state if we don't have a private state ID,
and we need to let the user know that.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new IncompleteFindContractPrivateStateConfig**(): `IncompleteFindContractPrivateStateConfig`

#### Returns

`IncompleteFindContractPrivateStateConfig`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_INCOMPLETE_FIND_PRIVATE_STATE_CONFIG"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

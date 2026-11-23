[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / PrivateStateNotFoundError

# Class: PrivateStateNotFoundError

No private state is stored under the private state id the caller named.

## Extends

- [`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new PrivateStateNotFoundError**(`message`, `options?`): `PrivateStateNotFoundError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`PrivateStateNotFoundError`

#### Overrides

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`category`](../../../midnight-js/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_C_PRIVATE_STATE_NOT_FOUND"` = `CONTRACTS_ERROR_CODES.PRIVATE_STATE_NOT_FOUND`

#### Overrides

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`code`](../../../midnight-js/index/classes/MidnightJsError.md#code)

[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / InvalidArgumentError

# Class: InvalidArgumentError

A value passed to a midnight-js function is not acceptable. Fix the call.

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new InvalidArgumentError**(`message`, `options?`): `InvalidArgumentError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`InvalidArgumentError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_G_INVALID_ARGUMENT"` = `COMMON_ERROR_CODES.INVALID_ARGUMENT`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

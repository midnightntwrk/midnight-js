[**Midnight.js API Reference v5.0.0-rc.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / EnvironmentUnsupportedError

# Class: EnvironmentUnsupportedError

The JavaScript runtime lacks an API midnight-js needs.

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new EnvironmentUnsupportedError**(`message`, `options?`): `EnvironmentUnsupportedError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`EnvironmentUnsupportedError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_G_ENVIRONMENT_UNSUPPORTED"`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

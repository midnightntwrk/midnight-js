[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ConfigurationError

# Class: ConfigurationError

Required setup is missing or was done in the wrong order.

## Extends

- [`MidnightJsError`](MidnightJsError.md)

## Constructors

### Constructor

> **new ConfigurationError**(`message`, `options?`): `ConfigurationError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`ConfigurationError`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`constructor`](MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`category`](MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_G_CONFIGURATION_MISSING"` = `COMMON_ERROR_CODES.CONFIGURATION_MISSING`

#### Overrides

[`MidnightJsError`](MidnightJsError.md).[`code`](MidnightJsError.md#code)

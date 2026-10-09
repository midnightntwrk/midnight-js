[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / InvalidProtocolSchemeError

# Class: InvalidProtocolSchemeError

An error describing an invalid protocol scheme.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new InvalidProtocolSchemeError**(`invalidScheme`, `allowableSchemes`): `InvalidProtocolSchemeError`

#### Parameters

##### invalidScheme

`string`

The invalid scheme.

##### allowableSchemes

`string`[]

The valid schemes that are allowed.

#### Returns

`InvalidProtocolSchemeError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### allowableSchemes

> `readonly` **allowableSchemes**: `string`[]

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INVALID_PROTOCOL_SCHEME"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### invalidScheme

> `readonly` **invalidScheme**: `string`

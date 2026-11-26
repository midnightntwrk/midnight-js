[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [types](../README.md) / InvalidProtocolSchemeError

# Class: InvalidProtocolSchemeError

An error describing an invalid protocol scheme.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

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

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### allowableSchemes

> `readonly` **allowableSchemes**: `string`[]

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INVALID_PROTOCOL_SCHEME"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### invalidScheme

> `readonly` **invalidScheme**: `string`

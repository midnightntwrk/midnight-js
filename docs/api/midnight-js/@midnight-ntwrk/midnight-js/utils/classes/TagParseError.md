[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / TagParseError

# Class: TagParseError

Base class of every error midnight-js raises itself. An error without a registered code came from a
dependency, the platform or user code, and midnight-js passed it through unchanged. Recognise one with
`hasErrorCode`, `isMidnightJsError` or `errorCategory` from the `midnight-js-utils` package: they read
`code`, so they also work when two copies of a package are installed, where `instanceof` does not.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new TagParseError**(`message`, `options?`): `TagParseError`

#### Parameters

##### message

`string`

##### options?

###### cause

`unknown`

#### Returns

`TagParseError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_TAG_PARSE_FAILED"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

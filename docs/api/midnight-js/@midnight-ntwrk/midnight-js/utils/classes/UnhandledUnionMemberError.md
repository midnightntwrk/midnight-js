[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / UnhandledUnionMemberError

# Class: UnhandledUnionMemberError

Raised by [assertNever](../functions/assertNever.md) when a value the compiler ruled out arrives
anyway, which happens when a payload is decoded from outside the build.

## Extends

- `Error`

## Constructors

### Constructor

> **new UnhandledUnionMemberError**(`context`): `UnhandledUnionMemberError`

#### Parameters

##### context

`string`

#### Returns

`UnhandledUnionMemberError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER"`

***

### context

> `readonly` **context**: `string`

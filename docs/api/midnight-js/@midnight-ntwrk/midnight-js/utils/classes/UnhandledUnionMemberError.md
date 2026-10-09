[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / UnhandledUnionMemberError

# Class: UnhandledUnionMemberError

Raised by [assertNever](../functions/assertNever.md) when a value the compiler ruled out arrives
anyway, which happens when a payload is decoded from outside the build.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new UnhandledUnionMemberError**(`context`): `UnhandledUnionMemberError`

#### Parameters

##### context

`string`

#### Returns

`UnhandledUnionMemberError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### context

> `readonly` **context**: `string`

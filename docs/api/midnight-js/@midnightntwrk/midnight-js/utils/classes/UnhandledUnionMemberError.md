[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [utils](../README.md) / UnhandledUnionMemberError

# Class: UnhandledUnionMemberError

Raised by [assertNever](../functions/assertNever.md) when a value the compiler ruled out arrives
anyway, which happens when a payload is decoded from outside the build.

## Extends

- [`MidnightJsError`](../../index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new UnhandledUnionMemberError**(`context`): `UnhandledUnionMemberError`

#### Parameters

##### context

`string`

#### Returns

`UnhandledUnionMemberError`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`constructor`](../../index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`category`](../../index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER"`

#### Overrides

[`MidnightJsError`](../../index/classes/MidnightJsError.md).[`code`](../../index/classes/MidnightJsError.md#code)

***

### context

> `readonly` **context**: `string`

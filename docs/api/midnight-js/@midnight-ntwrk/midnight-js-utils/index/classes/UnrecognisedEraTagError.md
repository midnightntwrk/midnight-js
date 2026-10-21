[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / UnrecognisedEraTagError

# Class: UnrecognisedEraTagError

Raised by [requireLedger9](../functions/requireLedger9.md) when the value carries no era tag this build recognises: `null`,
a value with no `version`, or an era newer than this build.

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new UnrecognisedEraTagError**(`context`, `value`): `UnrecognisedEraTagError`

#### Parameters

##### context

`string`

Names the call site that handles only v9 values.

##### value

`unknown`

The offending value. Only its `version` is read.

#### Returns

`UnrecognisedEraTagError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_U_UNRECOGNISED_ERA_TAG"` = `UTILS_ERROR_CODES.UNRECOGNISED_ERA_TAG`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### context

> `readonly` **context**: `string`

Names the call site that handles only v9 values.

***

### received

> `readonly` **received**: `string`

What the value's `version` held, or `'null'` / `'undefined'` when there was none.

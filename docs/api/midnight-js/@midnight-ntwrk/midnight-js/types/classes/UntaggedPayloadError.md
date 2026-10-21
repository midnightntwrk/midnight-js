[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / UntaggedPayloadError

# Class: UntaggedPayloadError

Thrown when a payload passed to, or returned from, a provider method carries
no recognised `version` discriminant — most often a transaction passed
untagged, the shape these methods took before 5.0.0. A read method's record
is reported as a record, because its v8 variant carries `tx`, not `txBytes`.

The method signatures make this unrepresentable in TypeScript, so it is reachable
only from JavaScript, from a consumer compiled against a pre-5.0.0
`midnight-js-types`, or from a payload that crossed an untyped boundary.
It carries a `code` so a caller can tell this apart from an arbitrary crash.

## Extends

- [`MidnightJsError`](../../classes/MidnightJsError.md)

## Constructors

### Constructor

> **new UntaggedPayloadError**(`method`, `payload`): `UntaggedPayloadError`

#### Parameters

##### method

[`ProviderMethod`](../type-aliases/ProviderMethod.md)

The method the payload was passed to or returned from. Typed as the full
              [ProviderMethod](../type-aliases/ProviderMethod.md) vocabulary because this error is thrown
              from both the transaction methods and the read methods.

##### payload

`unknown`

The offending payload. Only its `version` field is read;
               the payload's contents never reach the message.

#### Returns

`UntaggedPayloadError`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`constructor`](../../classes/MidnightJsError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`category`](../../classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD"`

#### Overrides

[`MidnightJsError`](../../classes/MidnightJsError.md).[`code`](../../classes/MidnightJsError.md#code)

***

### method

> `readonly` **method**: [`ProviderMethod`](../type-aliases/ProviderMethod.md)

***

### received

> `readonly` **received**: `string`

What the payload's `version` field actually held.

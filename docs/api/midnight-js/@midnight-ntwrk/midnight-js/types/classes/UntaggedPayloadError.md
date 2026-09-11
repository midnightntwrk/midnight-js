[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / UntaggedPayloadError

# Class: UntaggedPayloadError

Thrown when a payload crossing a version-tagged seam carries no recognised
`version` discriminant — most often a transaction passed untagged, the shape
these seams took before 5.0.0.

The seam types make this unrepresentable in TypeScript, so it is reachable
only from JavaScript, from a consumer compiled against a pre-5.0.0
`midnight-js-types`, or from a payload that crossed an untyped boundary.
It carries a `code` so a caller can tell this apart from an arbitrary crash.

## Extends

- `Error`

## Constructors

### Constructor

> **new UntaggedPayloadError**(`seam`, `payload`): `UntaggedPayloadError`

#### Parameters

##### seam

[`Seam`](../type-aliases/Seam.md)

The method that received the payload. Typed as the full
            [Seam](../type-aliases/Seam.md) vocabulary because this error is thrown from both
            the transaction seams and the read surface.

##### payload

`unknown`

The offending payload. Only its `version` field is read;
               the payload's contents never reach the message.

#### Returns

`UntaggedPayloadError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD"` = `"MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD"`

***

### received

> `readonly` **received**: `string`

What the payload's `version` field actually held.

***

### seam

> `readonly` **seam**: [`Seam`](../type-aliases/Seam.md)

[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / V8PayloadUnsupportedError

# Class: V8PayloadUnsupportedError

Thrown by a provider that only speaks the v9 ledger runtime when it is
handed the v8 arm of a versioned transaction payload — serialized,
tag-prefixed bytes instead of a live v9 transaction object.

Catching this does NOT mean "the framework cannot do it yet". It means the
specific implementation on that seam does not serve the v8 arm — permanently
for the lifting adapters, contingently for a concrete provider.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## See

[SeamEraDeclarations](../../documents/SeamEraDeclarations.md) for which providers raise it and why, and for
how it differs from [SeamEraUnsupportedError](SeamEraUnsupportedError.md).

## Extends

- [`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md)

## Constructors

### Constructor

> **new V8PayloadUnsupportedError**(`seam`, `byteLength?`): `V8PayloadUnsupportedError`

#### Parameters

##### seam

[`ProviderSeam`](../type-aliases/ProviderSeam.md)

The provider method that received the payload.

##### byteLength?

`number`

Size of the rejected payload, recorded so a report of
                  this error says something about what arrived. `undefined`
                  when the payload's `txBytes` was missing or not a
                  `Uint8Array` — which the message states, because that
                  caller has a second problem worth knowing about.

#### Returns

`V8PayloadUnsupportedError`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#constructor)

## Properties

### byteLength?

> `readonly` `optional` **byteLength?**: `number`

Size of the rejected payload, recorded so a report of
                  this error says something about what arrived. `undefined`
                  when the payload's `txBytes` was missing or not a
                  `Uint8Array` — which the message states, because that
                  caller has a second problem worth knowing about.

***

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js-protocol/index/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`category`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED"` = `V8_PAYLOAD_UNSUPPORTED`

#### Overrides

[`MidnightJsError`](../../../midnight-js-protocol/index/classes/MidnightJsError.md).[`code`](../../../midnight-js-protocol/index/classes/MidnightJsError.md#code)

***

### seam

> `readonly` **seam**: [`ProviderSeam`](../type-aliases/ProviderSeam.md)

The provider method that received the payload.

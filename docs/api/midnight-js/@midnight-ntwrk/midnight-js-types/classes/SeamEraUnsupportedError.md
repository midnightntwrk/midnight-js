[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / SeamEraUnsupportedError

# Class: SeamEraUnsupportedError

Thrown BEFORE an operation starts, when one of the three transaction seams
declares that it does not serve the ledger era that operation needs.

This is a pre-flight refusal, not a payload rejection. It is raised by
`assertSeamsSupportEra` from the provider set alone — no payload has been
built, no proof has been requested — and it exists so that an operation whose
wallet cannot balance the result is refused before its proof is paid for,
rather than after.

Distinct from [V8PayloadUnsupportedError](V8PayloadUnsupportedError.md) on purpose, and the two are
not interchangeable:

- This error means the provider SAID SO, in `supportedEras`, before it was
  asked to do anything. The remedy is to wire a different provider.
- `V8PayloadUnsupportedError` means a payload reached a seam that will not
  take it. That remains the defence in depth: a declaration is a claim by the
  implementation, and nothing verifies it, so the narrowing at each seam still
  runs and still reports its own error when a declaration turns out to be
  wrong.

Catch it via its stable `code`, using `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## Extends

- `Error`

## Constructors

### Constructor

> **new SeamEraUnsupportedError**(`seam`, `era`, `declared`): `SeamEraUnsupportedError`

#### Parameters

##### seam

[`ProviderSeam`](../type-aliases/ProviderSeam.md)

The seam whose provider does not declare `era`. Reported in
            pipeline order, so this names the first seam the operation
            would have reached.

##### era

`string`

The ledger era the operation needs every seam to serve.

##### declared

readonly `string`[]

What that provider does declare. An empty list is the
                honest reading of a provider carrying no declaration at all
                — which a JavaScript caller, or a consumer built against an
                older `midnight-js-types`, really can supply.

#### Returns

`SeamEraUnsupportedError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_SEAM_ERA_UNSUPPORTED"` = `SEAM_ERA_UNSUPPORTED`

***

### declared

> `readonly` **declared**: readonly `string`[]

What that provider does declare. An empty list is the
                honest reading of a provider carrying no declaration at all
                — which a JavaScript caller, or a consumer built against an
                older `midnight-js-types`, really can supply.

***

### era

> `readonly` **era**: `string`

The ledger era the operation needs every seam to serve.

***

### seam

> `readonly` **seam**: [`ProviderSeam`](../type-aliases/ProviderSeam.md)

The seam whose provider does not declare `era`. Reported in
            pipeline order, so this names the first seam the operation
            would have reached.

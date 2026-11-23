[**Midnight.js API Reference v5.0.2**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerError

# Abstract Class: IndexerError

Base class for the errors this provider raises itself. Consumers can catch
them with a single `instanceof IndexerError` check.

NOT EXHAUSTIVE OVER A READ. Two failure classes deliberately escape this
check: `DeserializationError` (`@midnightntwrk/midnight-js-utils`) and
`Ledger8RuntimeMissingError` (`@midnightntwrk/midnight-js-protocol`). Both
are `MidnightJsError`s, so `isMidnightJsError` recognises them as well as
every `IndexerError`. A failure from a dependency can still pass through
uncoded.

To branch on one failure, match on `code` via `hasErrorCode` from
`@midnightntwrk/midnight-js-utils`.

## See

[ErrorBoundaries](../../documents/ErrorBoundaries.md) for what each escaping class reports, and why
wrapping it here would mislead.

## Extends

- [`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md)

## Extended by

- [`IndexerFormattedError`](IndexerFormattedError.md)
- [`IndexerQueryError`](IndexerQueryError.md)
- [`IndexerDataError`](IndexerDataError.md)
- [`IndexerSubscriptionDataError`](IndexerSubscriptionDataError.md)
- [`IndexerProviderConfigError`](IndexerProviderConfigError.md)
- [`IndexerInvariantError`](IndexerInvariantError.md)
- [`DecoderEraUnsupportedError`](DecoderEraUnsupportedError.md)
- [`UnknownRecordEraError`](UnknownRecordEraError.md)
- [`IndexerPayloadTooLargeError`](IndexerPayloadTooLargeError.md)

## Constructors

### Constructor

> **new IndexerError**(`message?`): `IndexerError`

#### Parameters

##### message?

`string`

#### Returns

`IndexerError`

#### Inherited from

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/index/classes/MidnightJsError.md#constructor)

### Constructor

> **new IndexerError**(`message?`, `options?`): `IndexerError`

#### Parameters

##### message?

`string`

##### options?

`ErrorOptions`

#### Returns

`IndexerError`

#### Inherited from

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`constructor`](../../../midnight-js/index/classes/MidnightJsError.md#constructor)

## Properties

### category

> `abstract` `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/index/type-aliases/MidnightJsErrorCategory.md)

#### Inherited from

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`category`](../../../midnight-js/index/classes/MidnightJsError.md#category)

***

### code

> `abstract` `readonly` **code**: `` `MIDNIGHT_JS_${string}` ``

#### Inherited from

[`MidnightJsError`](../../../midnight-js/index/classes/MidnightJsError.md).[`code`](../../../midnight-js/index/classes/MidnightJsError.md#code)

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / UnknownRecordEraError

# Class: UnknownRecordEraError

Raised when a record's `protocolVersion` maps to no ledger era at all —
a network outside the node major range this framework knows about, or a
value that is not a non-negative integer.

Distinct from [DecoderEraUnsupportedError](DecoderEraUnsupportedError.md), which reports an era this build
has no decoder for — an era that was named, just not one of ours. Here
nothing was named: the integer maps to no era, so there is no era to report.
A record whose era resolved but whose bytes then would not decode is neither
of these: it leaves as the `DeserializationError` the runtime produced.

Exists so that both era-resolution failures reach a consumer through
`IndexerError`.
The underlying `UnknownProtocolVersionError` from
`@midnight-ntwrk/midnight-js-protocol` is preserved on `cause`.

## Extends

- [`IndexerError`](IndexerError.md)

## Constructors

### Constructor

> **new UnknownRecordEraError**(`method`, `protocolVersion`, `options`, `recordRef?`): `UnknownRecordEraError`

#### Parameters

##### method

[`ReadMethod`](../../../midnight-js/types/type-aliases/ReadMethod.md)

The read method that attempted to resolve the era.

##### protocolVersion

`number`

The raw value the indexer reported.

##### options

Carries the originating error on `cause`.

###### cause

`unknown`

##### recordRef?

`string`

The record this happened on, when known.

#### Returns

`UnknownRecordEraError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`IndexerError`](IndexerError.md).[`category`](IndexerError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA"` = `PROVIDER_ERROR_CODES.UNKNOWN_RECORD_ERA`

#### Overrides

[`IndexerError`](IndexerError.md).[`code`](IndexerError.md#code)

***

### method

> `readonly` **method**: [`ReadMethod`](../../../midnight-js/types/type-aliases/ReadMethod.md)

The read method that attempted to resolve the era.

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The raw value the indexer reported.

***

### recordRef?

> `readonly` `optional` **recordRef?**: `string`

The record this happened on, when known.

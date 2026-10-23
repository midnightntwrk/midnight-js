[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerQueryError

# Class: IndexerQueryError

An error raised when an Apollo query or fetch fails at the transport layer
(network failure, malformed response, Apollo client error) — distinct from
the case where the server returns a well-formed response containing
`GraphQLFormattedError` entries, which is reported via
[IndexerFormattedError](IndexerFormattedError.md).

Preserves the original Apollo error via `Error.cause` so consumers can
inspect network details and the original stack.

## Extends

- [`IndexerError`](IndexerError.md)

## Constructors

### Constructor

> **new IndexerQueryError**(`message`, `options?`): `IndexerQueryError`

#### Parameters

##### message

`string`

##### options?

`ErrorOptions`

#### Returns

`IndexerQueryError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`IndexerError`](IndexerError.md).[`category`](IndexerError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INDEXER_QUERY_FAILED"` = `PROVIDER_ERROR_CODES.INDEXER_QUERY_FAILED`

#### Overrides

[`IndexerError`](IndexerError.md).[`code`](IndexerError.md#code)

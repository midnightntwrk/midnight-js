[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerFormattedError

# Class: IndexerFormattedError

Raised when a GraphQL response includes one or more `GraphQLFormattedError`
entries. Aggregates all server-side errors into a single numbered message
and exposes the original array via [errors](#errors).

The field is named `errors` (not `cause`) because the standard ES2022
`Error.cause` slot is contractually a single underlying error, not a
peer collection. Reusing `cause` would confuse Node's `util.inspect`
causal chain, Sentry, and other structured loggers.

Transport-level and other Apollo failures are reported via [IndexerQueryError](IndexerQueryError.md).

## Extends

- [`IndexerError`](IndexerError.md)

## Constructors

### Constructor

> **new IndexerFormattedError**(`errors`): `IndexerFormattedError`

#### Parameters

##### errors

readonly `GraphQLFormattedError`[]

The GraphQL errors reported by the server.

#### Returns

`IndexerFormattedError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

## Properties

### category

> `readonly` **category**: [`MidnightJsErrorCategory`](../../../midnight-js/type-aliases/MidnightJsErrorCategory.md)

#### Overrides

[`IndexerError`](IndexerError.md).[`category`](IndexerError.md#category)

***

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_INDEXER_GRAPHQL_FAILED"` = `PROVIDER_ERROR_CODES.INDEXER_GRAPHQL_FAILED`

#### Overrides

[`IndexerError`](IndexerError.md).[`code`](IndexerError.md#code)

***

### errors

> `readonly` **errors**: readonly `GraphQLFormattedError`[]

The GraphQL errors reported by the server.

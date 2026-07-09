[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / IndexerError

# Abstract Class: IndexerError

Base class for all errors raised by the indexer public data provider.
Consumers can catch any indexer error with a single `instanceof IndexerError` check.

## Extends

- `Error`

## Extended by

- [`IndexerFormattedError`](IndexerFormattedError.md)
- [`IndexerQueryError`](IndexerQueryError.md)
- [`IndexerDataError`](IndexerDataError.md)
- [`IndexerSubscriptionDataError`](IndexerSubscriptionDataError.md)
- [`IndexerProviderConfigError`](IndexerProviderConfigError.md)
- [`IndexerInvariantError`](IndexerInvariantError.md)

## Constructors

### Constructor

> **new IndexerError**(`message?`): `IndexerError`

#### Parameters

##### message?

`string`

#### Returns

`IndexerError`

#### Inherited from

`Error.constructor`

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

`Error.constructor`

[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / IndexerError

# Abstract Class: IndexerError

Base class for the errors this provider raises itself. Consumers can catch
them with a single `instanceof IndexerError` check.

NOT EXHAUSTIVE OVER A READ. Two failure classes deliberately escape this
check: `DeserializationError` (`@midnight-ntwrk/midnight-js-utils`) and
`Ledger8RuntimeMissingError` (`@midnight-ntwrk/midnight-js-protocol`).

A consumer that needs to catch everything a read can raise should catch
broadly and branch, or match on `code` via `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

## See

[ErrorBoundaries](../../documents/ErrorBoundaries.md) for what each escaping class reports, and why
wrapping it here would mislead.

## Extends

- `Error`

## Extended by

- [`IndexerFormattedError`](IndexerFormattedError.md)
- [`IndexerQueryError`](IndexerQueryError.md)
- [`IndexerDataError`](IndexerDataError.md)
- [`IndexerSubscriptionDataError`](IndexerSubscriptionDataError.md)
- [`IndexerProviderConfigError`](IndexerProviderConfigError.md)
- [`IndexerInvariantError`](IndexerInvariantError.md)
- [`EraUnsupportedError`](EraUnsupportedError.md)
- [`EraUnresolvableError`](EraUnresolvableError.md)

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

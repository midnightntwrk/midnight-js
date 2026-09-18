[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / IndexerError

# Abstract Class: IndexerError

Base class for the errors this provider raises itself. Consumers can catch
them with a single `instanceof IndexerError` check.

Two failure classes deliberately escape that check, because both report
something that is not an indexer fault and wrapping them would hide what
they are:

- `DeserializationError` (`@midnight-ntwrk/midnight-js-utils`) — bytes that
  will not decode, whichever era's runtime read them. It carries the era,
  the `protocolVersion`, the seam and the record on its `context.details`.
- `Ledger8RuntimeMissingError`
  (`@midnight-ntwrk/midnight-js-protocol`) — the pre-fork ledger runtime
  could not be acquired for a v8-era record. That is an installation or
  bundling failure in the consumer's own dependency tree, not a bad record,
  and a caller who saw it as an `IndexerError` would go looking at the
  indexer.

A consumer that needs to catch everything a read can raise should catch
broadly and branch, or match on `code` via `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`.

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

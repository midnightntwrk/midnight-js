[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / IndexerInvariantError

# Class: IndexerInvariantError

An error raised when an upstream invariant the provider relies on does
not hold at runtime — for example, when an `Rx.filter` upstream is
expected to guarantee a non-empty array but the downstream `.map` still
sees an empty one. Distinct from [IndexerDataError](IndexerDataError.md) (well-formed
indexer payload that violates protocol-level expectations) and from
[IndexerSubscriptionDataError](IndexerSubscriptionDataError.md) (server returned a `null` for a
top-level subscription field) — `IndexerInvariantError` flags a bug in
the provider's pipeline composition, not in the data.

## Extends

- [`IndexerError`](IndexerError.md)

## Constructors

### Constructor

> **new IndexerInvariantError**(`message`): `IndexerInvariantError`

#### Parameters

##### message

`string`

#### Returns

`IndexerInvariantError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

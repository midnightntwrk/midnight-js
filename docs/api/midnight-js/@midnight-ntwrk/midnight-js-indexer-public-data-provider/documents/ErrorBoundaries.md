[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / ErrorBoundaries

# What `IndexerError` covers, and the two failures that escape it

`IndexerError` is the base class for the errors this provider raises itself, so
a consumer can catch them with one `instanceof` check.

Two failure classes deliberately escape that check. Both report something that is
NOT an indexer fault, and wrapping them would hide what they are — sending a
caller to investigate the indexer over a problem that is somewhere else entirely.

## `DeserializationError`

From `@midnight-ntwrk/midnight-js-utils`. Bytes that will not decode, whichever
era's runtime read them.

It carries the era, the `protocolVersion`, the seam and the record on its
`context.details`. Wrapped as an `IndexerError`, all of that becomes a detail of
"the indexer failed", which is the wrong first question.

## `Ledger8RuntimeMissingError`

From `@midnight-ntwrk/midnight-js-protocol`. The pre-fork ledger runtime could
not be acquired for a retained-era record.

That is an installation or bundling failure in the CONSUMER'S OWN dependency
tree, not a bad record and not a bad response. A caller who saw it as an
`IndexerError` would go looking at the indexer, which is working correctly.

## Catching everything a read can raise

Catch broadly and branch, or match on `code` via `hasErrorCode` from
`@midnight-ntwrk/midnight-js-utils`. Do not treat `instanceof IndexerError` as
exhaustive over a read — it is exhaustive over this provider's own faults, which
is a narrower thing.

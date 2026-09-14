[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / EraUnsupportedError

# Class: EraUnsupportedError

Raised when the era-keyed transaction decoder is asked for an era this build
ships no decoder for.

Within one build this cannot happen: the era is a `LedgerVersion` and the
decoder table is total over that union, so a missing entry is a compile
error. It is reachable across builds — a consumer whose installed
`@midnight-ntwrk/midnight-js-protocol` is newer than this package, whose era
resolver therefore answers an era this decoder table predates.

`protocolVersion` is the raw integer the indexer reported, kept so a report
of this error identifies the network rather than only the era.

## Extends

- [`IndexerError`](IndexerError.md)

## Constructors

### Constructor

> **new EraUnsupportedError**(`seam`, `era`, `protocolVersion`, `recordRef?`): `EraUnsupportedError`

#### Parameters

##### seam

[`ReadSeam`](../../midnight-js/types/type-aliases/ReadSeam.md)

The read-surface method that performed the decode.

##### era

`"v8"` \| `"v9"`

The era the decoder table was asked for.

##### protocolVersion

`number`

The raw integer the indexer reported.

##### recordRef?

`string`

The record this happened on — a transaction id or a
                 contract address. A dApp holding several watches open
                 concurrently cannot otherwise tell which one rejected.

#### Returns

`EraUnsupportedError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_ERA_UNSUPPORTED"` = `PROVIDER_ERROR_CODES.ERA_UNSUPPORTED`

***

### era

> `readonly` **era**: `"v8"` \| `"v9"`

The era the decoder table was asked for.

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The raw integer the indexer reported.

***

### recordRef?

> `readonly` `optional` **recordRef?**: `string`

The record this happened on — a transaction id or a
                 contract address. A dApp holding several watches open
                 concurrently cannot otherwise tell which one rejected.

***

### seam

> `readonly` **seam**: [`ReadSeam`](../../midnight-js/types/type-aliases/ReadSeam.md)

The read-surface method that performed the decode.

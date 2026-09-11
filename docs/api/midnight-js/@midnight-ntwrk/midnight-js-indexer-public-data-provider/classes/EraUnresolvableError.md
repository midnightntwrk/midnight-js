[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / EraUnresolvableError

# Class: EraUnresolvableError

Raised when a record's `protocolVersion` maps to no ledger era at all —
a network outside the node major range this framework knows about, or a
value that is not a non-negative integer.

Distinct from [EraUnsupportedError](EraUnsupportedError.md), which reports an era this build
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

> **new EraUnresolvableError**(`seam`, `protocolVersion`, `options`, `recordRef?`): `EraUnresolvableError`

#### Parameters

##### seam

[`ReadSeam`](../../midnight-js/types/type-aliases/ReadSeam.md)

The read-surface method that attempted to resolve the era.

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

`EraUnresolvableError`

#### Overrides

[`IndexerError`](IndexerError.md).[`constructor`](IndexerError.md#constructor)

## Properties

### code

> `readonly` **code**: `"MIDNIGHT_JS_PR_ERA_UNRESOLVABLE"` = `PROVIDER_ERROR_CODES.ERA_UNRESOLVABLE`

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The raw value the indexer reported.

***

### recordRef?

> `readonly` `optional` **recordRef?**: `string`

The record this happened on, when known.

***

### seam

> `readonly` **seam**: [`ReadSeam`](../../midnight-js/types/type-aliases/ReadSeam.md)

The read-surface method that attempted to resolve the era.

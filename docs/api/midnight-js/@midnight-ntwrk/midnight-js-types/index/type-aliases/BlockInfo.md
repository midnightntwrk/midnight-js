[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / BlockInfo

# Type Alias: BlockInfo

> **BlockInfo** = `object`

Identifying information for a block, and the ledger era it was produced under.

## Properties

### hash

> `readonly` **hash**: `string`

The hex-encoded block hash.

***

### height

> `readonly` **height**: `number`

The block height.

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol-version integer this block was produced under, which dates it
to a ledger era.

Resolve it with `versionOfRecord` from `@midnight-ntwrk/midnight-js-protocol`:
this type satisfies that function's `VersionedRecord` parameter, so
`versionOfRecord(block)` is the whole call. It throws
`UnknownProtocolVersionError` for a version this build cannot place on the
era timeline.

Implementations MUST report the era of *this* block, never the network
head's, so a block read from before a hard fork keeps reporting the era it
was produced in.

Implementations carry the integer through as the network reported it, and
do NOT reject a version this build cannot place. That failure surfaces
when the caller resolves the era, not on the read.

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / networkHeadVersion

# Function: networkHeadVersion()

> **networkHeadVersion**(`source`): `Promise`\<`"v8"` \| `"v9"`\>

Queries `source` for the network's current head protocol version and
resolves it to a [LedgerVersion](../type-aliases/LedgerVersion.md).

The source is expected to read the network on every call. This is the
construct path: the era being resolved is the one a transaction built now
will land in, and a stale reading is wrong exactly at the fork boundary,
where that question matters. `PublicDataProvider.queryLatestProtocolVersion`
states the same prohibition as a requirement on its implementations; this
parameter is a structural type, so nothing here can enforce it. See ADR 0007.

## Parameters

### source

[`ProtocolVersionSource`](../interfaces/ProtocolVersionSource.md)

The indexer or node client to ask for the head version.

## Returns

`Promise`\<`"v8"` \| `"v9"`\>

A promise for the [LedgerVersion](../type-aliases/LedgerVersion.md) at the network head.

## Throws

[UnknownProtocolVersionError](../classes/UnknownProtocolVersionError.md) tagged with the `construct`
path, on the same two conditions as [protocolVersionToLedger](protocolVersionToLedger.md). A
rejection from `source.queryLatestProtocolVersion()` propagates unchanged.

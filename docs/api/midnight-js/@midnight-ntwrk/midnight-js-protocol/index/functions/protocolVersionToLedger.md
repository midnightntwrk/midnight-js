[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / protocolVersionToLedger

# Function: protocolVersionToLedger()

> **protocolVersionToLedger**(`protocolVersion`, `path?`): `"v8"` \| `"v9"`

Maps a raw `protocolVersion` integer (as returned by the indexer or node)
onto the ledger runtime it corresponds to.

| protocolVersion range | node version | ledger |
| --------------------- | ------------ | ------ |
| 1_000_000 – 1_999_999 | 1.x          | v8     |
| 2_000_000 – 2_999_999 | 2.x          | v9     |

Most call sites should not call this directly. Prefer
[versionOfRecord](versionOfRecord.md) for a `protocolVersion` read off an existing
indexer/node record, or [networkHeadVersion](networkHeadVersion.md) for the network's
current head version — both tag the resulting error with the correct
`path` automatically. Pass `path` explicitly here only when neither helper
fits the call site.

## Parameters

### protocolVersion

`number`

The raw integer read from an indexer or node record.

### path?

[`VersionResolutionPath`](../type-aliases/VersionResolutionPath.md) = `'construct'`

Which resolution path a failure is attributed to. Defaults to
`'construct'`, and decides which of the two error codes a failure carries.

## Returns

`"v8"` \| `"v9"`

The [LedgerVersion](../type-aliases/LedgerVersion.md) that `protocolVersion`'s node major maps
onto.

## Throws

[UnknownProtocolVersionError](../classes/UnknownProtocolVersionError.md) with `reason: 'malformed'` when
`protocolVersion` is not a non-negative integer, and with `reason: 'unknown'`
when it is a well-formed integer outside every range above.

## See

[SharedTableDiscipline](../../documents/SharedTableDiscipline.md)

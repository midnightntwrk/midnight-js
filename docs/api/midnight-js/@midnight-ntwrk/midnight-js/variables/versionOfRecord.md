[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / versionOfRecord

# Variable: versionOfRecord

> `const` **versionOfRecord**: (`record`) => [`LedgerVersion`](../type-aliases/LedgerVersion.md)

Resolves the ledger version for a record's `protocolVersion` field (e.g. a
transaction or block already read from the indexer).

## Parameters

### record

[`VersionedRecord`](../interfaces/VersionedRecord.md)

Any object carrying a raw `protocolVersion` integer field.

## Returns

[`LedgerVersion`](../type-aliases/LedgerVersion.md)

The [LedgerVersion](../type-aliases/LedgerVersion.md) that record was written under.

## Throws

[UnknownProtocolVersionError](../classes/UnknownProtocolVersionError.md) tagged with the `read` path, on
the same two conditions as protocolVersionToLedger.

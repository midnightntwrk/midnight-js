[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / versionOfRecord

# Variable: versionOfRecord

> `const` **versionOfRecord**: (`record`) => [`LedgerEra`](../type-aliases/LedgerEra.md)

Resolves the ledger era for a record's `protocolVersion` field (e.g. a
transaction or block already read from the indexer).

## Parameters

### record

[`VersionedRecord`](../interfaces/VersionedRecord.md)

Any object carrying a raw `protocolVersion` integer field.

## Returns

[`LedgerEra`](../type-aliases/LedgerEra.md)

The [LedgerEra](../type-aliases/LedgerEra.md) that record was written under.

## Throws

[UnknownProtocolVersionError](../classes/UnknownProtocolVersionError.md) tagged with the `read` path, on
the same two conditions as protocolVersionToLedger.

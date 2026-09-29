[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / V8TxBytes

# Interface: V8TxBytes

The v8 arm of every transaction payload crossing a provider seam
(`proveTx`, `balanceTx`, `submitTx`), in both directions.

A v8-era transaction crosses as serialized, tag-prefixed bytes rather than as
a live ledger object, and `version` says which runtime produced them.

NOT VALIDATED: any `Uint8Array` satisfies `txBytes`, and nothing here checks
the tag prefix. The arm is identical for all three seams, so it says nothing
about which pipeline stage the transaction has reached — on this path, stage
is the caller's responsibility.

## See

VersionTaggedPayloads for why a live object cannot cross.

## Properties

### txBytes

> `readonly` **txBytes**: `Uint8Array`

Serialized, tag-prefixed byte form. Unvalidated — see the note above.

***

### version

> `readonly` **version**: `"v8"`

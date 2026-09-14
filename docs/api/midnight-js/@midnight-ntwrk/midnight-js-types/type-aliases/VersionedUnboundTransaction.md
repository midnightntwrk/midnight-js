[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / VersionedUnboundTransaction

# Type Alias: VersionedUnboundTransaction

> **VersionedUnboundTransaction** = [`VersionedTx`](VersionedTx.md)\<[`UnboundTransaction`](UnboundTransaction.md)\>

A proven-but-unbalanced transaction coming back from a [ProofProvider](../interfaces/ProofProvider.md):
either the live v9 ledger object, or the serialized bytes of a v8-era
transaction.

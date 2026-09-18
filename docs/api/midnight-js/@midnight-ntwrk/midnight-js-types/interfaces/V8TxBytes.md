[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / V8TxBytes

# Interface: V8TxBytes

The v8 arm of every transaction payload crossing a provider seam
(`proveTx`, `balanceTx`, `submitTx`), in both directions.

During the ledger-fork window a v8-era transaction never crosses a provider
seam as a live ledger object: the two ledger runtimes are separate WASM
instances, so an object built by one cannot be handed to the other. It
crosses as its serialized, tag-prefixed byte form instead, and the
`version` discriminant says which runtime produced those bytes.

Two things this type deliberately does not express. The bytes are not
validated — any `Uint8Array` satisfies `txBytes`, and nothing here checks
for the tag prefix. And the arm is identical for all three seams, so it
carries no statement about which pipeline stage the transaction has reached;
on the v8 path, stage is the caller's responsibility.

## Properties

### txBytes

> `readonly` **txBytes**: `Uint8Array`

Serialized, tag-prefixed byte form. Unvalidated — see the note above.

***

### version

> `readonly` **version**: `"v8"`

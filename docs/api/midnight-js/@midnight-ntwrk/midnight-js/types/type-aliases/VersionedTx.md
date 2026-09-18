[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / VersionedTx

# Type Alias: VersionedTx\<T\>

> **VersionedTx**\<`T`\> = [`V8TxBytes`](../interfaces/V8TxBytes.md) \| [`V9Tx`](../interfaces/V9Tx.md)\<`T`\>

A transaction payload crossing a provider seam, discriminated by the ledger
runtime it belongs to: serialized bytes for the v8 era ([V8TxBytes](../interfaces/V8TxBytes.md)),
or the live ledger object for v9 ([V9Tx](../interfaces/V9Tx.md)).

Consumers must narrow on `version` before touching the payload — there is
deliberately no untagged form, so a bare `Uint8Array` (bytes whose era
nobody can tell) is never assignable where this type is expected.

The seam types do not tie the input era to the output era: nothing here
stops a provider returning a v9 result for a v8 input. A v9-only flow is
expected to check that at its own boundary.

## Type Parameters

### T

`T`

The v9 ledger transaction type carried by the `'v9'` arm.

## Example

```typescript
const proven = await proofProvider.proveTx({ version: 'v9', tx: unprovenTx });
switch (proven.version) {
  case 'v9':
    return proven.tx; // live v9 ledger object
  case 'v8':
    return decodeV8(proven.txBytes); // serialized, tag-prefixed bytes
}
```

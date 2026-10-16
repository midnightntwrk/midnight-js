[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / VersionedTransaction

# Type Alias: VersionedTransaction\<T\>

> **VersionedTransaction**\<`T`\> = [`Ledger8TransactionBytes`](../interfaces/Ledger8TransactionBytes.md) \| [`Ledger9Transaction`](../interfaces/Ledger9Transaction.md)\<`T`\>

A transaction payload passed to a provider method, discriminated by the ledger
runtime it belongs to: serialized bytes for the v8 era ([Ledger8TransactionBytes](../interfaces/Ledger8TransactionBytes.md)),
or the live ledger object for v9 ([Ledger9Transaction](../interfaces/Ledger9Transaction.md)).

Consumers must narrow on `version` before touching the payload — there is
deliberately no untagged form, so a bare `Uint8Array` (bytes whose era
nobody can tell) is never assignable where this type is expected.

The provider method types do not tie the input era to the output era: nothing here
stops a provider returning a v9 result for a v8 input. A v9-only flow is
expected to check that at its own boundary.

## Type Parameters

### T

`T`

The v9 ledger transaction type carried by the `'v9'` variant.

## Example

```typescript
const proven = await proofProvider.proveTx({ version: 'v9', tx: unprovenTx });
switch (proven.version) {
  case 'v9':
    return proven.tx; // live v9 ledger object
  case 'v8':
    return decodeLedger8(proven.txBytes); // serialized, tag-prefixed bytes
}
```

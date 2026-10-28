[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeLedgerTransaction

# Variable: deserializeLedgerTransaction

> `const` **deserializeLedgerTransaction**: \<`E`\>(`era`, `bytes`, `ctx`) => `Promise`\<[`LedgerTransaction`](../../types/classes/LedgerTransaction.md)\<`"Finalized"`, `E`\>\>

Deserialize a finalized ledger transaction of the given era from raw bytes
and seal it in a [LedgerTransaction](../../types/classes/LedgerTransaction.md) handle of that era.
The proof / signature / binding markers are hidden — all current callers
use `('signature', 'proof', 'binding', ...)`. Add a new wrapper if a
different combination is needed.

A v8 transaction is read through `loadLedger8Protocol`, so the handle wraps
an object of the v8 ledger copy this framework loaded.

## Type Parameters

### E

`E` *extends* [`LedgerVersion`](../../type-aliases/LedgerVersion.md)

## Parameters

### era

`E`

The ledger era that wrote the bytes. Never derived from the bytes.

### bytes

`Uint8Array`

The serialized finalized transaction.

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

The call site, named on a refusal.

## Returns

`Promise`\<[`LedgerTransaction`](../../types/classes/LedgerTransaction.md)\<`"Finalized"`, `E`\>\>

A finalized handle of `era`.

## Throws

On any underlying ledger deserialization
  failure, including bytes written by the other era.

## Throws

If `era` is not a ledger version.

## Throws

If `era` is `'v8'` and the v8 runtime
  cannot be loaded.

## Throws

If a duplicate install of the ledger
  package decoded the bytes.

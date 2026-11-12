[**Midnight.js API Reference v5.0.0**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeLedgerTransaction

# Variable: deserializeLedgerTransaction

> `const` **deserializeLedgerTransaction**: \<`E`\>(`era`, `bytes`, `ctx`) => `Promise`\<[`LedgerTransaction`](../../types/classes/LedgerTransaction.md)\<`"Finalized"`, `E`\>\>

Wraps the bytes of a finalized ledger transaction of the given era in a
[LedgerTransaction](../../types/classes/LedgerTransaction.md) handle of that era. Only the header is checked;
the caller decodes the handle with its own ledger copy, so reading a v8
record does not load the v8 runtime.

## Type Parameters

### E

`E` *extends* [`LedgerEra`](../../type-aliases/LedgerEra.md)

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

If the bytes do not start with the header the
  ledger of `era` writes for a finalized transaction, including bytes written
  by the other era.

## Throws

If `era` is not a ledger era.

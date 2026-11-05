[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../../README.md) / [index](../README.md) / deserializeLedgerTransaction

# Function: deserializeLedgerTransaction()

> **deserializeLedgerTransaction**\<`E`\>(`era`, `bytes`, `ctx`): `Promise`\<`LedgerTransaction`\<`"Finalized"`, `E`\>\>

Wraps the bytes of a finalized ledger transaction of the given era in a
LedgerTransaction handle of that era. Only the header is checked;
the caller decodes the handle with its own ledger copy, so reading a v8
record does not load the v8 runtime.

## Type Parameters

### E

`E` *extends* `"v8"` \| `"v9"`

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

`Promise`\<`LedgerTransaction`\<`"Finalized"`, `E`\>\>

A finalized handle of `era`.

## Throws

If the bytes do not start with the header the
  ledger of `era` writes for a finalized transaction, including bytes written
  by the other era.

## Throws

If `era` is not a ledger era.

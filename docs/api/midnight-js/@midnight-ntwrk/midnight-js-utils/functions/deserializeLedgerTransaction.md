[**Midnight.js API Reference v4.1.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / deserializeLedgerTransaction

# Function: deserializeLedgerTransaction()

> **deserializeLedgerTransaction**(`bytes`, `ctx`): `Transaction`\<`SignatureEnabled`, `Proof`, `Binding`\>

Deserialize a ledger LedgerTransaction from raw bytes.
The proof / signature / binding markers are hidden — all current callers
use `('signature', 'proof', 'binding', ...)`. Add a new wrapper if a
different combination is needed.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

`Transaction`\<`SignatureEnabled`, `Proof`, `Binding`\>

## Throws

On any underlying ledger deserialization
  failure.

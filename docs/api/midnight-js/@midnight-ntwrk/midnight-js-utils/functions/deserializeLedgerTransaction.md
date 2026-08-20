[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / deserializeLedgerTransaction

# Function: deserializeLedgerTransaction()

> **deserializeLedgerTransaction**(`bytes`, `ctx`): [`Transaction`](../../midnight-js/types/classes/Transaction.md)\<[`SignatureEnabled`](../../midnight-js-protocol/ledger/classes/SignatureEnabled.md), [`Proof`](../../midnight-js-protocol/ledger/classes/Proof.md), [`Binding`](../../midnight-js-protocol/ledger/classes/Binding.md)\>

Deserialize a ledger [LedgerTransaction](../../midnight-js/types/classes/Transaction.md) from raw bytes.
The proof / signature / binding markers are hidden — all current callers
use `('signature', 'proof', 'binding', ...)`. Add a new wrapper if a
different combination is needed.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

[`Transaction`](../../midnight-js/types/classes/Transaction.md)\<[`SignatureEnabled`](../../midnight-js-protocol/ledger/classes/SignatureEnabled.md), [`Proof`](../../midnight-js-protocol/ledger/classes/Proof.md), [`Binding`](../../midnight-js-protocol/ledger/classes/Binding.md)\>

## Throws

On any underlying ledger deserialization
  failure.

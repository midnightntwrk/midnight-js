[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeLedgerTransaction

# Variable: deserializeLedgerTransaction

> `const` **deserializeLedgerTransaction**: (`bytes`, `ctx`) => [`Transaction`](https://github.com/midnightntwrk/midnight-ledger)\<[`SignatureEnabled`](https://github.com/midnightntwrk/midnight-ledger), [`Proof`](https://github.com/midnightntwrk/midnight-ledger), [`Binding`](https://github.com/midnightntwrk/midnight-ledger)\>

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

[`Transaction`](https://github.com/midnightntwrk/midnight-ledger)\<[`SignatureEnabled`](https://github.com/midnightntwrk/midnight-ledger), [`Proof`](https://github.com/midnightntwrk/midnight-ledger), [`Binding`](https://github.com/midnightntwrk/midnight-ledger)\>

## Throws

On any underlying ledger deserialization
  failure.

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeLedgerParameters

# Variable: deserializeLedgerParameters

> `const` **deserializeLedgerParameters**: (`bytes`, `ctx`) => [`LedgerParameters`](../../../midnight-js-protocol/ledger/classes/LedgerParameters.md)

Defined in: packages/utils/dist/index.d.ts:167

Deserialize ledger [LedgerParameters](../../../midnight-js-protocol/ledger/classes/LedgerParameters.md) from raw bytes.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

[`LedgerParameters`](../../../midnight-js-protocol/ledger/classes/LedgerParameters.md)

## Throws

On any underlying ledger deserialization
  failure.

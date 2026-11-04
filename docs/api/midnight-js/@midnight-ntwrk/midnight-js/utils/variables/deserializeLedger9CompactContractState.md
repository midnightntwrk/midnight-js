[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeLedger9CompactContractState

# Variable: deserializeLedger9CompactContractState

> `const` **deserializeLedger9CompactContractState**: (`bytes`, `ctx`) => [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

Deserialize a compact-runtime CompactContractState from raw bytes.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

## Throws

On any underlying compact-runtime
  deserialization failure.

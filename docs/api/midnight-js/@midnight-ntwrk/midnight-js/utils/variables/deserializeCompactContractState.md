[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeCompactContractState

# Variable: deserializeCompactContractState

> `const` **deserializeCompactContractState**: (`bytes`, `ctx`) => [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/utils/dist/index.d.ts:143

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

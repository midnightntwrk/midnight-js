[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / deserializeCompactContractState

# Function: deserializeCompactContractState()

> **deserializeCompactContractState**(`bytes`, `ctx`): [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

Deserialize a compact-runtime [CompactContractState](https://github.com/midnightntwrk/midnight-ledger) from raw bytes.

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

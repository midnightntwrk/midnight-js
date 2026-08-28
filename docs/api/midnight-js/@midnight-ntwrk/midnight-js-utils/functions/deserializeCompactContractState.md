[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / deserializeCompactContractState

# Function: deserializeCompactContractState()

> **deserializeCompactContractState**(`bytes`, `ctx`): [`ContractState`](../../midnight-js-protocol/onchain-runtime/classes/ContractState.md)

Deserialize a compact-runtime [CompactContractState](../../midnight-js-protocol/onchain-runtime/classes/ContractState.md) from raw bytes.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

[`ContractState`](../../midnight-js-protocol/onchain-runtime/classes/ContractState.md)

## Throws

On any underlying compact-runtime
  deserialization failure.

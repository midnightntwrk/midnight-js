[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / deserializeZswapChainState

# Function: deserializeZswapChainState()

> **deserializeZswapChainState**(`bytes`, `ctx`): [`ZswapChainState`](../../midnight-js-protocol/ledger/classes/ZswapChainState.md)

Deserialize a ledger [ZswapChainState](../../midnight-js-protocol/ledger/classes/ZswapChainState.md) from raw bytes.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

[`ZswapChainState`](../../midnight-js-protocol/ledger/classes/ZswapChainState.md)

## Throws

On any underlying ledger deserialization
  failure.

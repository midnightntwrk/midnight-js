[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeZswapChainState

# Variable: deserializeZswapChainState

> `const` **deserializeZswapChainState**: (`bytes`, `ctx`) => [`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

Deserialize a ledger [ZswapChainState](https://github.com/midnightntwrk/midnight-ledger) from raw bytes.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

[`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

## Throws

On any underlying ledger deserialization
  failure.

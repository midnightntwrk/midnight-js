[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeZswapChainState

# Variable: deserializeZswapChainState

> `const` **deserializeZswapChainState**: (`bytes`, `ctx`) => [`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/utils/dist/index.d.ts:150

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

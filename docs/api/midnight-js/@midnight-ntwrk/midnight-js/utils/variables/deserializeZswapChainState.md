[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / deserializeZswapChainState

# Variable: deserializeZswapChainState

> `const` **deserializeZswapChainState**: (`bytes`, `ctx`) => [`ZswapChainState`](../../../midnight-js-protocol/ledger/classes/ZswapChainState.md)

Defined in: packages/utils/dist/index.d.ts:150

Deserialize a ledger [ZswapChainState](../../../midnight-js-protocol/ledger/classes/ZswapChainState.md) from raw bytes.

## Parameters

### bytes

`Uint8Array`

### ctx

[`CallSiteContext`](../interfaces/CallSiteContext.md)

## Returns

[`ZswapChainState`](../../../midnight-js-protocol/ledger/classes/ZswapChainState.md)

## Throws

On any underlying ledger deserialization
  failure.

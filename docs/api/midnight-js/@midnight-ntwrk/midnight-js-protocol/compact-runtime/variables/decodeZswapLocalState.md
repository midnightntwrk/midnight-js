[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / decodeZswapLocalState

# Variable: decodeZswapLocalState

> `const` **decodeZswapLocalState**: (`state`) => [`ZswapLocalState`](../interfaces/ZswapLocalState.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:158

Converts an [EncodedZswapLocalState](../interfaces/EncodedZswapLocalState.md) to a [ZswapLocalState](../interfaces/ZswapLocalState.md). Used when we need to use data from contract
execution to construct transactions.

## Parameters

### state

[`EncodedZswapLocalState`](../interfaces/EncodedZswapLocalState.md)

The encoded Zswap local state.

## Returns

[`ZswapLocalState`](../interfaces/ZswapLocalState.md)

[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / emptyZswapLocalState

# Variable: emptyZswapLocalState

> `const` **emptyZswapLocalState**: (`coinPublicKey`) => [`EncodedZswapLocalState`](../interfaces/EncodedZswapLocalState.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:121

Constructs a new [EncodedZswapLocalState](../interfaces/EncodedZswapLocalState.md) with the given coin public key. The result can be used to create a
[ConstructorContext](../interfaces/ConstructorContext.md).

## Parameters

### coinPublicKey

[`CoinPublicKey`](../../onchain-runtime/type-aliases/CoinPublicKey.md) \| [`EncodedCoinPublicKey`](../interfaces/EncodedCoinPublicKey.md)

The Zswap coin public key of the user executing the circuit.

## Returns

[`EncodedZswapLocalState`](../interfaces/EncodedZswapLocalState.md)

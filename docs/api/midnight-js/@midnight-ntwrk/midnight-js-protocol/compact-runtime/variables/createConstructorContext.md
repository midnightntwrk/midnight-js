[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / createConstructorContext

# Variable: createConstructorContext

> `const` **createConstructorContext**: \<`PS`\>(`initialPrivateState`, `coinPublicKey`) => [`ConstructorContext`](../interfaces/ConstructorContext.md)\<`PS`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/constructor-context.d.ts:22

Creates a new [ConstructorContext](../interfaces/ConstructorContext.md) with the given initial private state and an empty Zswap local state.

## Type Parameters

### PS

`PS`

## Parameters

### initialPrivateState

`PS`

The private state to use to execute the contract's constructor.

### coinPublicKey

[`CoinPublicKey`](../../onchain-runtime/type-aliases/CoinPublicKey.md) \| [`EncodedCoinPublicKey`](../interfaces/EncodedCoinPublicKey.md)

The Zswap coin public key of the user executing the contract.

## Returns

[`ConstructorContext`](../interfaces/ConstructorContext.md)\<`PS`\>

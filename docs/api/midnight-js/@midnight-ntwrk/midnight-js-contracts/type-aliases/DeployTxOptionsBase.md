[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / DeployTxOptionsBase

# Type Alias: DeployTxOptionsBase\<C\>

> **DeployTxOptionsBase**\<`C`\> = [`ContractConstructorOptionsWithArguments`](ContractConstructorOptionsWithArguments.md)\<`C`\> & `object`

Base type for deploy transaction configuration.

## Type Declaration

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<[`CoinPublicKey`](../../midnight-js-protocol/onchain-runtime/type-aliases/CoinPublicKey.md), [`EncPublicKey`](../../midnight-js-protocol/ledger/type-aliases/EncPublicKey.md)\>

An optional mapping of [CoinPublicKey](../../midnight-js-protocol/onchain-runtime/type-aliases/CoinPublicKey.md) to [EncPublicKey](../../midnight-js-protocol/ledger/type-aliases/EncPublicKey.md) that can be used to resolve encryption
keys for coins created in the contract constructor. This is useful in cases where the constructor creates
outputs to addresses that don't belong to the current user.

### signingKey

> `readonly` **signingKey**: [`SigningKey`](../../midnight-js-protocol/onchain-runtime/type-aliases/SigningKey.md)

The signing key to add as the to-be-deployed contract's maintenance authority.

## Type Parameters

### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

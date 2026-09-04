[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / DeployTxOptionsBase

# Type Alias: DeployTxOptionsBase\<C\>

> **DeployTxOptionsBase**\<`C`\> = [`ContractConstructorOptionsWithArguments`](ContractConstructorOptionsWithArguments.md)\<`C`\> & `object`

Base type for deploy transaction configuration.

## Type Declaration

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<[`CoinPublicKey`](https://github.com/midnightntwrk/midnight-ledger), [`EncPublicKey`](https://github.com/midnightntwrk/midnight-ledger)\>

An optional mapping of [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) that can be used to resolve encryption
keys for coins created in the contract constructor. This is useful in cases where the constructor creates
outputs to addresses that don't belong to the current user.

### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The signing key to add as the to-be-deployed contract's maintenance authority.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

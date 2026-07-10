[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / ScopedTransactionOptions

# Interface: ScopedTransactionOptions

Options for use when creating scoped transactions.

## Properties

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<`string`, `string`\>

An optional mapping of CoinPublicKey to EncPublicKey that can be used to resolve encryption
keys for coins created during circuit execution.

***

### scopeName?

> `readonly` `optional` **scopeName?**: `string`

An optional name for the transaction scope.

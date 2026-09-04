[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ScopedTransactionOptions

# Interface: ScopedTransactionOptions

Defined in: packages/contracts/dist/index.d.ts:743

Options for use when creating scoped transactions.

## Properties

### additionalCoinEncPublicKeyMappings?

> `readonly` `optional` **additionalCoinEncPublicKeyMappings?**: `ReadonlyMap`\<`string`, `string`\>

Defined in: packages/contracts/dist/index.d.ts:752

An optional mapping of [CoinPublicKey](https://github.com/midnightntwrk/midnight-ledger) to [EncPublicKey](https://github.com/midnightntwrk/midnight-ledger) that can be used to resolve encryption
keys for coins created during circuit execution.

***

### scopeName?

> `readonly` `optional` **scopeName?**: `string`

Defined in: packages/contracts/dist/index.d.ts:747

An optional name for the transaction scope.

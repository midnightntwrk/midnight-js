[**Midnight.js API Reference v4.1.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ContractEventAddress

# Interface: ContractEventAddress

A `sender` / `recipient` on an unshielded event. The indexer returns a tagged
union (`Either<ZswapCoinPublicKey, ContractAddress>`); this preserves the
discriminator so consumers can tell a user address from a contract address
rather than receiving a bare, ambiguous string.

## Properties

### kind

> `readonly` **kind**: `"user"` \| `"contract"`

Which kind of address `value` holds.

***

### value

> `readonly` **value**: `string`

The hex-encoded address.

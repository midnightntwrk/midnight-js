[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractEventAddress

# Interface: ContractEventAddress

Defined in: packages/types/dist/index.d.ts:944

A `sender` / `recipient` on an unshielded event. The indexer returns a tagged
union (`Either<ZswapCoinPublicKey, ContractAddress>`); this preserves the
discriminator so consumers can tell a user address from a contract address
rather than receiving a bare, ambiguous string.

## Properties

### kind

> `readonly` **kind**: `"user"` \| `"contract"`

Defined in: packages/types/dist/index.d.ts:946

Which kind of address `value` holds.

***

### value

> `readonly` **value**: `string`

Defined in: packages/types/dist/index.d.ts:948

The hex-encoded address.

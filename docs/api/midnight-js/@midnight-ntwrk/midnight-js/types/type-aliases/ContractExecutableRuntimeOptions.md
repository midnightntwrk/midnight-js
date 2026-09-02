[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractExecutableRuntimeOptions

# Type Alias: ContractExecutableRuntimeOptions

> **ContractExecutableRuntimeOptions** = `object`

Defined in: packages/types/dist/index.d.ts:313

Options for use when constructing a Compact.js contract executable runtime.

## Properties

### coinPublicKey

> `readonly` **coinPublicKey**: `string`

Defined in: packages/types/dist/index.d.ts:315

The current user's ZSwap public key.

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](../../../midnight-js-protocol/onchain-runtime/type-aliases/SigningKey.md)

Defined in: packages/types/dist/index.d.ts:317

The signing key to add as the to-be-deployed contract's maintenance authority.

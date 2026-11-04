[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / Ledger9ContractExecutableRuntimeOptions

# Type Alias: Ledger9ContractExecutableRuntimeOptions

> **Ledger9ContractExecutableRuntimeOptions** = `object`

Options for use when constructing a Compact.js contract executable runtime.

## Properties

### coinPublicKey

> `readonly` **coinPublicKey**: `string`

The current user's ZSwap public key.

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The signing key to add as the to-be-deployed contract's maintenance authority.

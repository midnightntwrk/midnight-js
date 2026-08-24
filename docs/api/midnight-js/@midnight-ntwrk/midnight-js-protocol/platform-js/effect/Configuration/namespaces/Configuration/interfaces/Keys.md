[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../../README.md) / [platform-js/effect/Configuration](../../../README.md) / [Configuration](../README.md) / Keys

# Interface: Keys

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Configuration.d.ts:29

Accessors for retrieving keys.

## keys

### coinPublicKey

> `readonly` **coinPublicKey**: [`CoinPublicKey`](../../../../../namespaces/CoinPublicKey/type-aliases/CoinPublicKey.md)

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Configuration.d.ts:35

Gets the current user's Zswap public key.

***

### getSigningKey()

> **getSigningKey**(): `Option`\<[`SigningKey`](../../../../../namespaces/SigningKey/interfaces/SigningKey.md)\>

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Configuration.d.ts:50

Gets a signing key.

#### Returns

`Option`\<[`SigningKey`](../../../../../namespaces/SigningKey/interfaces/SigningKey.md)\>

#### Remarks

A signing key is required when creating Contract Maintenance Authority (CMA) instances when initializing
new contracts. If `Option.None` is returned, then a new singing key is sampled and used for the CMA
instead. Returning the same signing key is useful when that key is to be used to maintain multiple contracts.

The returned key carries its [kind](../../../../../namespaces/SigningKey/type-aliases/SignatureKind.md) (the `tag`), taken from the
`keys.signingKind` configuration value. When `signingKind` is not configured it defaults to
[SigningKey.DefaultSignatureKind](../../../../../namespaces/SigningKey/variables/DefaultSignatureKind.md) (`'schnorr'`).

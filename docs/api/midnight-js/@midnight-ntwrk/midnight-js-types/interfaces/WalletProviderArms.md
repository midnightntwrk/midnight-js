[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / WalletProviderArms

# Interface: WalletProviderArms

The per-era arms [createWalletProviderFromArms](../functions/createWalletProviderFromArms.md) assembles a
[WalletProvider](WalletProvider.md) from.

The two key readers sit beside the arms rather than inside one: a coin public
key and an encryption public key are properties of the wallet, not of the era
a transaction belongs to, and duplicating them per era would invite two
answers to one question.

## Properties

### currentEra

> `readonly` **currentEra**: [`CurrentEraBalancer`](../type-aliases/CurrentEraBalancer.md)

Required: every wallet balances the current era.

***

### getCoinPublicKey

> `readonly` **getCoinPublicKey**: () => `string`

#### Returns

`string`

***

### getEncryptionPublicKey

> `readonly` **getEncryptionPublicKey**: () => `string`

#### Returns

`string`

***

### retainedEras?

> `readonly` `optional` **retainedEras?**: `Partial`\<`Readonly`\<`Record`\<`"v8"`, [`RetainedEraBalancer`](../type-aliases/RetainedEraBalancer.md)\>\>\>

Optional, one entry per retained era this wallet balances.

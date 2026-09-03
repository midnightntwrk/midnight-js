[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ProvingProvider

# Type Alias: ProvingProvider

> **ProvingProvider** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2365

## Methods

### check()

> **check**(`serializedPreimage`, `keyLocation`): `Promise`\<(`bigint` \| `undefined`)[]\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2366

#### Parameters

##### serializedPreimage

`Uint8Array`

##### keyLocation

`string`

#### Returns

`Promise`\<(`bigint` \| `undefined`)[]\>

***

### lookupKey()

> **lookupKey**(`keyLocation`): `Promise`\<[`ProvingKeyMaterial`](ProvingKeyMaterial.md) \| `undefined`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2375

#### Parameters

##### keyLocation

`string`

#### Returns

`Promise`\<[`ProvingKeyMaterial`](ProvingKeyMaterial.md) \| `undefined`\>

***

### prove()

> **prove**(`serializedPreimage`, `keyLocation`, `overwriteBindingInput?`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2370

#### Parameters

##### serializedPreimage

`Uint8Array`

##### keyLocation

`string`

##### overwriteBindingInput?

`bigint`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / KeyMaterialProvider

# Type Alias: KeyMaterialProvider

> **KeyMaterialProvider** = `object`

Defined in: packages/types/dist/index.d.ts:269

DApp connector API type for key material retrieval

## Methods

### getProverKey()

> **getProverKey**(`circuitKeyLocation`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: packages/types/dist/index.d.ts:271

#### Parameters

##### circuitKeyLocation

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### getVerifierKey()

> **getVerifierKey**(`circuitKeyLocation`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: packages/types/dist/index.d.ts:272

#### Parameters

##### circuitKeyLocation

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### getZKIR()

> **getZKIR**(`circuitKeyLocation`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: packages/types/dist/index.d.ts:270

#### Parameters

##### circuitKeyLocation

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

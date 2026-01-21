[**Midnight.js API Reference v3.0.0-alpha.14**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / KeyMaterialProvider

# Type Alias: KeyMaterialProvider

> **KeyMaterialProvider** = `object`

DApp connector API type for key material retrieval

## Methods

### getProverKey()

> **getProverKey**(`circuitKeyLocation`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

#### Parameters

##### circuitKeyLocation

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### getVerifierKey()

> **getVerifierKey**(`circuitKeyLocation`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

#### Parameters

##### circuitKeyLocation

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

***

### getZKIR()

> **getZKIR**(`circuitKeyLocation`): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

#### Parameters

##### circuitKeyLocation

`string`

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>

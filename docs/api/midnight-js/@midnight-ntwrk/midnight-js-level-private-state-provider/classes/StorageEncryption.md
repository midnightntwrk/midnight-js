[**Midnight.js API Reference v3.0.0-alpha.13**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-level-private-state-provider](../README.md) / StorageEncryption

# Class: StorageEncryption

## Constructors

### Constructor

> **new StorageEncryption**(`password`, `existingSalt?`): `StorageEncryption`

#### Parameters

##### password

`string`

##### existingSalt?

`Buffer`\<`ArrayBufferLike`\>

#### Returns

`StorageEncryption`

## Methods

### decrypt()

> **decrypt**(`encryptedData`): `string`

#### Parameters

##### encryptedData

`string`

#### Returns

`string`

***

### encrypt()

> **encrypt**(`data`): `string`

#### Parameters

##### data

`string`

#### Returns

`string`

***

### getSalt()

> **getSalt**(): `Buffer`

#### Returns

`Buffer`

***

### isEncrypted()

> `static` **isEncrypted**(`data`): `boolean`

#### Parameters

##### data

`string`

#### Returns

`boolean`

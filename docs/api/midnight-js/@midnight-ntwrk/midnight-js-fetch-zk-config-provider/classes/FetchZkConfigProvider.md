[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-fetch-zk-config-provider](../README.md) / FetchZkConfigProvider

# Class: FetchZkConfigProvider\<K\>

Retrieves ZK artifacts from a remote source and verifies them against the `compactc` integrity manifest.

## Extends

- [`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md)\<`K`\>

## Type Parameters

### K

`K` *extends* `string`

## Constructors

### Constructor

> **new FetchZkConfigProvider**\<`K`\>(`baseURL`, `options?`): `FetchZkConfigProvider`\<`K`\>

#### Parameters

##### baseURL

`string`

The endpoint to query for ZK artifacts.

##### options?

[`FetchZkConfigProviderOptions`](../type-aliases/FetchZkConfigProviderOptions.md) = `{}`

Custom fetch and integrity-verification options.

#### Returns

`FetchZkConfigProvider`\<`K`\>

#### Overrides

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`constructor`](../../midnight-js/types/classes/ZKConfigProvider.md#constructor)

## Properties

### baseURL

> `readonly` **baseURL**: `string`

The endpoint to query for ZK artifacts.

## Methods

### asKeyMaterialProvider()

> **asKeyMaterialProvider**(): [`KeyMaterialProvider`](../../midnight-js/types/type-aliases/KeyMaterialProvider.md)

#### Returns

[`KeyMaterialProvider`](../../midnight-js/types/type-aliases/KeyMaterialProvider.md)

#### Inherited from

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`asKeyMaterialProvider`](../../midnight-js/types/classes/ZKConfigProvider.md#askeymaterialprovider)

***

### get()

> **get**(`circuitId`): `Promise`\<[`ZKConfig`](../../midnight-js/types/interfaces/ZKConfig.md)\<`K`\>\>

Retrieves all zero-knowledge artifacts produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the artifacts to retrieve.

#### Returns

`Promise`\<[`ZKConfig`](../../midnight-js/types/interfaces/ZKConfig.md)\<`K`\>\>

#### Inherited from

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`get`](../../midnight-js/types/classes/ZKConfigProvider.md#get)

***

### getProverKey()

> **getProverKey**(`circuitId`): `Promise`\<[`ProverKey`](../../midnight-js/types/type-aliases/ProverKey.md)\>

Retrieves the prover key produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the prover key to retrieve.

#### Returns

`Promise`\<[`ProverKey`](../../midnight-js/types/type-aliases/ProverKey.md)\>

#### Overrides

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`getProverKey`](../../midnight-js/types/classes/ZKConfigProvider.md#getproverkey)

***

### getVerifierKey()

> **getVerifierKey**(`circuitId`): `Promise`\<[`VerifierKey`](../../midnight-js/types/type-aliases/VerifierKey.md)\>

Retrieves the verifier key produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the verifier key to retrieve.

#### Returns

`Promise`\<[`VerifierKey`](../../midnight-js/types/type-aliases/VerifierKey.md)\>

#### Overrides

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`getVerifierKey`](../../midnight-js/types/classes/ZKConfigProvider.md#getverifierkey)

***

### getVerifierKeys()

> **getVerifierKeys**(`circuitIds`): `Promise`\<\[`K`, [`VerifierKey`](../../midnight-js/types/type-aliases/VerifierKey.md)\][]\>

Retrieves the verifier keys produced by `compactc` compiler for the given circuits.

#### Parameters

##### circuitIds

`K`[]

The circuit IDs of the verifier keys to retrieve.

#### Returns

`Promise`\<\[`K`, [`VerifierKey`](../../midnight-js/types/type-aliases/VerifierKey.md)\][]\>

#### Inherited from

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`getVerifierKeys`](../../midnight-js/types/classes/ZKConfigProvider.md#getverifierkeys)

***

### getZKIR()

> **getZKIR**(`circuitId`): `Promise`\<[`ZKIR`](../../midnight-js/types/type-aliases/ZKIR.md)\>

Retrieves the zero-knowledge intermediate representation produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the ZKIR to retrieve.

#### Returns

`Promise`\<[`ZKIR`](../../midnight-js/types/type-aliases/ZKIR.md)\>

#### Overrides

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`getZKIR`](../../midnight-js/types/classes/ZKConfigProvider.md#getzkir)

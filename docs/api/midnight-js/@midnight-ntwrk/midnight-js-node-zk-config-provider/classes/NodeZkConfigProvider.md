[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-node-zk-config-provider](../README.md) / NodeZkConfigProvider

# Class: NodeZkConfigProvider\<K\>

[ZKConfigProvider](../../midnight-js/types/classes/ZKConfigProvider.md) that reads keys and zkIR from the local filesystem and verifies them
against the `compactc` integrity manifest.

## Extends

- [`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md)\<`K`\>

## Type Parameters

### K

`K` *extends* `string`

The type of the circuit ID used by the provider.

## Constructors

### Constructor

> **new NodeZkConfigProvider**\<`K`\>(`directory`, `integrityOptions?`): `NodeZkConfigProvider`\<`K`\>

#### Parameters

##### directory

`string`

The base directory containing the key and ZKIR subdirectories.

##### integrityOptions?

[`ZkConfigIntegrityOptions`](../../midnight-js/utils/interfaces/ZkConfigIntegrityOptions.md) = `{}`

Integrity-verification options.

#### Returns

`NodeZkConfigProvider`\<`K`\>

#### Overrides

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`constructor`](../../midnight-js/types/classes/ZKConfigProvider.md#constructor)

## Properties

### directory

> `readonly` **directory**: `string`

The base directory containing the key and ZKIR subdirectories.

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

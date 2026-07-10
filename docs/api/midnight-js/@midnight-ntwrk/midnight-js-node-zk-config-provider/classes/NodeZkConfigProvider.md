[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-node-zk-config-provider](../README.md) / NodeZkConfigProvider

# Class: NodeZkConfigProvider\<K\>

[ZKConfigProvider](#) that reads keys and zkIR from the local filesystem and verifies them
against the `compactc` integrity manifest.

## Extends

- [`ZKConfigProvider`](#)\<`K`\>

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

`ZkConfigIntegrityOptions` = `{}`

Integrity-verification options.

#### Returns

`NodeZkConfigProvider`\<`K`\>

#### Overrides

`ZKConfigProvider<K>.constructor`

## Properties

### directory

> `readonly` **directory**: `string`

The base directory containing the key and ZKIR subdirectories.

## Methods

### asKeyMaterialProvider()

> **asKeyMaterialProvider**(): `KeyMaterialProvider`

#### Returns

`KeyMaterialProvider`

#### Inherited from

`ZKConfigProvider.asKeyMaterialProvider`

***

### get()

> **get**(`circuitId`): `Promise`\<`ZKConfig`\<`K`\>\>

Retrieves all zero-knowledge artifacts produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the artifacts to retrieve.

#### Returns

`Promise`\<`ZKConfig`\<`K`\>\>

#### Inherited from

`ZKConfigProvider.get`

***

### getProverKey()

> **getProverKey**(`circuitId`): `Promise`\<`ProverKey`\>

Retrieves the prover key produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the prover key to retrieve.

#### Returns

`Promise`\<`ProverKey`\>

#### Overrides

`ZKConfigProvider.getProverKey`

***

### getVerifierKey()

> **getVerifierKey**(`circuitId`): `Promise`\<`VerifierKey`\>

Retrieves the verifier key produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the verifier key to retrieve.

#### Returns

`Promise`\<`VerifierKey`\>

#### Overrides

`ZKConfigProvider.getVerifierKey`

***

### getVerifierKeys()

> **getVerifierKeys**(`circuitIds`): `Promise`\<\[`K`, `VerifierKey`\][]\>

Retrieves the verifier keys produced by `compactc` compiler for the given circuits.

#### Parameters

##### circuitIds

`K`[]

The circuit IDs of the verifier keys to retrieve.

#### Returns

`Promise`\<\[`K`, `VerifierKey`\][]\>

#### Inherited from

`ZKConfigProvider.getVerifierKeys`

***

### getZKIR()

> **getZKIR**(`circuitId`): `Promise`\<`ZKIR`\>

Retrieves the zero-knowledge intermediate representation produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the ZKIR to retrieve.

#### Returns

`Promise`\<`ZKIR`\>

#### Overrides

`ZKConfigProvider.getZKIR`

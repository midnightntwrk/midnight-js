[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

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

### getArtifactRuntimeVersion()

> **getArtifactRuntimeVersion**(): `Promise`\<`string`\>

Reports the `compact-runtime` this bundle was built against, preferring the source an
application can anchor to a hash it controls.

The INTEGRITY MANIFEST is consulted first, because `expectedManifestHash` pins it to a digest
the application supplies at build time, while everything else is fetched from the same host as
the artifacts it describes. This value selects which ledger pipeline executes the call, so
whoever serves the artifacts must not be the one who decides it.

`compiler/contract-info.json` is the fallback, for bundles that carry no manifest at all --
`compactc` only began emitting one in 0.33, which is exactly the retained-era case. It is put
through the same integrity gate as every key and ZKIR, so under the default `require` an
unvouched-for description is refused rather than trusted.

Cached per provider instance. A FAILED fetch is not cached, so a transient network error does
not permanently refuse an artifact set that is really there.

#### Returns

`Promise`\<`string`\>

The declared runtime version, verbatim.

#### Throws

ZkArtifactContractInfoError if the location does not serve the description, answers
with an SPA fallback page, or serves something that is not a compiler description.

#### Throws

ZkArtifactIntegrityError if the description is not covered by the manifest under a mode
that requires it.

#### Overrides

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md).[`getArtifactRuntimeVersion`](../../midnight-js/types/classes/ZKConfigProvider.md#getartifactruntimeversion)

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

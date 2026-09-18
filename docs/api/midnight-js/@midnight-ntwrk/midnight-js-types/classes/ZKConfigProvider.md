[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ZKConfigProvider

# Abstract Class: ZKConfigProvider\<K\>

A provider for zero-knowledge intermediate representations, prover keys, and verifier keys. All
three are used by the [ProofProvider](../interfaces/ProofProvider.md) to create a proof for a call transaction. The implementation
of this provider depends on the runtime environment, since each environment has different conventions
for accessing static artifacts.

## Type Parameters

### K

`K` *extends* `string`

The type of the circuit ID used by the provider.

## Constructors

### Constructor

> **new ZKConfigProvider**\<`K`\>(): `ZKConfigProvider`\<`K`\>

#### Returns

`ZKConfigProvider`\<`K`\>

## Methods

### asKeyMaterialProvider()

> **asKeyMaterialProvider**(): [`KeyMaterialProvider`](../type-aliases/KeyMaterialProvider.md)

#### Returns

[`KeyMaterialProvider`](../type-aliases/KeyMaterialProvider.md)

***

### get()

> **get**(`circuitId`): `Promise`\<[`ZKConfig`](../interfaces/ZKConfig.md)\<`K`\>\>

Retrieves all zero-knowledge artifacts produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the artifacts to retrieve.

#### Returns

`Promise`\<[`ZKConfig`](../interfaces/ZKConfig.md)\<`K`\>\>

***

### getArtifactRuntimeVersion()

> **getArtifactRuntimeVersion**(): `Promise`\<`string`\>

Reports the `compact-runtime` version the artifact set this provider serves was compiled
against, as `compactc` recorded it in `compiler/contract-info.json` (for example `'0.16.0'`).

A DECLARED fact, read from the compiler's own output, and the only era statement about an
artifact that survives a consumer's build: a bundler's `target` rewrites generated code, and a
minifier rewrites its names, but neither touches this file. It is what lets a caller's contract
be placed on the ledger-era timeline without inspecting the shape of the generated JavaScript.

Not abstract, and deliberately so: only the retained-era pipeline consults it, so a provider
written for current-era artifacts alone stays valid without implementing it and fails loudly
only if it is handed retained-era artifacts. Both providers this framework ships override it.

#### Returns

`Promise`\<`string`\>

The declared runtime version, verbatim.

#### Throws

ArtifactRuntimeVersionUnavailableError from this base implementation, which has no
artifact location to read and must not guess one.

***

### getProverKey()

> `abstract` **getProverKey**(`circuitId`): `Promise`\<[`ProverKey`](../type-aliases/ProverKey.md)\>

Retrieves the prover key produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the prover key to retrieve.

#### Returns

`Promise`\<[`ProverKey`](../type-aliases/ProverKey.md)\>

***

### getVerifierKey()

> `abstract` **getVerifierKey**(`circuitId`): `Promise`\<[`VerifierKey`](../type-aliases/VerifierKey.md)\>

Retrieves the verifier key produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the verifier key to retrieve.

#### Returns

`Promise`\<[`VerifierKey`](../type-aliases/VerifierKey.md)\>

***

### getVerifierKeys()

> **getVerifierKeys**(`circuitIds`): `Promise`\<\[`K`, [`VerifierKey`](../type-aliases/VerifierKey.md)\][]\>

Retrieves the verifier keys produced by `compactc` compiler for the given circuits.

#### Parameters

##### circuitIds

`K`[]

The circuit IDs of the verifier keys to retrieve.

#### Returns

`Promise`\<\[`K`, [`VerifierKey`](../type-aliases/VerifierKey.md)\][]\>

***

### getZKIR()

> `abstract` **getZKIR**(`circuitId`): `Promise`\<[`ZKIR`](../type-aliases/ZKIR.md)\>

Retrieves the zero-knowledge intermediate representation produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the ZKIR to retrieve.

#### Returns

`Promise`\<[`ZKIR`](../type-aliases/ZKIR.md)\>

[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ZKConfigProvider

# Abstract Class: ZKConfigProvider\<K\>

Defined in: packages/types/dist/index.d.ts:281

A provider for zero-knowledge intermediate representations, prover keys, and verifier keys. All
three are used by the [ProofProvider](../interfaces/ProofProvider.md) to create a proof for a call transaction. The implementation
of this provider depends on the runtime environment, since each environment has different conventions
for accessing static artifacts.

## Extended by

- [`FetchZkConfigProvider`](../../../midnight-js-fetch-zk-config-provider/classes/FetchZkConfigProvider.md)
- [`NodeZkConfigProvider`](../../../midnight-js-node-zk-config-provider/classes/NodeZkConfigProvider.md)

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

Defined in: packages/types/dist/index.d.ts:307

#### Returns

[`KeyMaterialProvider`](../type-aliases/KeyMaterialProvider.md)

***

### get()

> **get**(`circuitId`): `Promise`\<[`ZKConfig`](../interfaces/ZKConfig.md)\<`K`\>\>

Defined in: packages/types/dist/index.d.ts:306

Retrieves all zero-knowledge artifacts produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the artifacts to retrieve.

#### Returns

`Promise`\<[`ZKConfig`](../interfaces/ZKConfig.md)\<`K`\>\>

***

### getProverKey()

> `abstract` **getProverKey**(`circuitId`): `Promise`\<[`ProverKey`](../type-aliases/ProverKey.md)\>

Defined in: packages/types/dist/index.d.ts:291

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

Defined in: packages/types/dist/index.d.ts:296

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

Defined in: packages/types/dist/index.d.ts:301

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

Defined in: packages/types/dist/index.d.ts:286

Retrieves the zero-knowledge intermediate representation produced by `compactc` compiler for the given circuit.

#### Parameters

##### circuitId

`K`

The circuit ID of the ZKIR to retrieve.

#### Returns

`Promise`\<[`ZKIR`](../type-aliases/ZKIR.md)\>

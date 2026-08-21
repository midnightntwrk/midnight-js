[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../../../../README.md) / [compact-js/effect](../../../../../README.md) / [ZKConfiguration](../../../README.md) / [ZKConfiguration](../README.md) / Reader

# Interface: Reader\<C, PS\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKConfiguration.d.ts:29

Reads ZK assets.

## Type Parameters

### C

`C` *extends* [`Contract`](../../../../../../interfaces/Contract.md)\<`PS`\>

### PS

`PS`

## Methods

### getVerifierKey()

> **getVerifierKey**(`provableCircuitId`): `Effect`\<`Option`\<[`VerifierKey`](../../../../../../type-aliases/VerifierKey.md)\>, [`ZKConfigurationReadError`](../../../../ZKConfigurationReadError/classes/ZKConfigurationReadError.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKConfiguration.d.ts:38

Reads a verifier key for a given circuit identifier.

#### Parameters

##### provableCircuitId

[`ProvableCircuitId`](../../../../../../type-aliases/ProvableCircuitId.md)\<`C`\>

The identifier of the circuit to be read.

#### Returns

`Effect`\<`Option`\<[`VerifierKey`](../../../../../../type-aliases/VerifierKey.md)\>, [`ZKConfigurationReadError`](../../../../ZKConfigurationReadError/classes/ZKConfigurationReadError.md)\>

An `Effect` that yields an `Option` containing a [VerifierKey](../../../../../../variables/VerifierKey.md) for
`provableCircuitId` if the compiled contract was configured for verifier key generation; or fails with a
[ZKConfigurationReadError](../../../../ZKConfigurationReadError/classes/ZKConfigurationReadError.md).

***

### getVerifierKeys()

> **getVerifierKeys**(`provableCircuitIds`): `Effect`\<readonly \[[`ProvableCircuitId`](../../../../../../type-aliases/ProvableCircuitId.md)\<`C`, [`ProvableCircuitId`](../../../../../../namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>\>, `Option`\<[`VerifierKey`](../../../../../../type-aliases/VerifierKey.md)\>\][], [`ZKConfigurationReadError`](../../../../ZKConfigurationReadError/classes/ZKConfigurationReadError.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ZKConfiguration.d.ts:48

Batch reads the verifier keys for an array of circuit identifiers.

#### Parameters

##### provableCircuitIds

[`ProvableCircuitId`](../../../../../../type-aliases/ProvableCircuitId.md)\<`C`, [`ProvableCircuitId`](../../../../../../namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>\>[]

The identifiers of the circuits to be read.

#### Returns

`Effect`\<readonly \[[`ProvableCircuitId`](../../../../../../type-aliases/ProvableCircuitId.md)\<`C`, [`ProvableCircuitId`](../../../../../../namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>\>, `Option`\<[`VerifierKey`](../../../../../../type-aliases/VerifierKey.md)\>\][], [`ZKConfigurationReadError`](../../../../ZKConfigurationReadError/classes/ZKConfigurationReadError.md)\>

An `Effect` that yields an array of tuples describing an `Option` containing a
[VerifierKey](../../../../../../variables/VerifierKey.md) and its associated circuit identifier if the compiled contract
was configured for verifier key generation; or fails with a
[ZKConfigurationReadError](../../../../ZKConfigurationReadError/classes/ZKConfigurationReadError.md).

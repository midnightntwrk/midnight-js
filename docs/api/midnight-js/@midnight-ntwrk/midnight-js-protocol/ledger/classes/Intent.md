[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / Intent

# Class: Intent\<S, P, B\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2070

An intent is a potentially unbalanced partial transaction, that may be
combined with other intents to form a whole.

## Type Parameters

### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

### B

`B` *extends* [`Bindingish`](../type-aliases/Bindingish.md)

## Properties

### actions

> **actions**: [`ContractAction`](../type-aliases/ContractAction.md)\<`P`\>[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2144

The action sequence of this intent.

#### Throws

Writing throws if `B` is [Binding](Binding.md).

***

### binding

> `readonly` **binding**: `B`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2155

***

### dustActions

> **dustActions**: [`DustActions`](DustActions.md)\<`S`, `P`\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2149

The DUST interactions made by this intent

#### Throws

Writing throws if `B` is [Binding](Binding.md).

***

### fallibleUnshieldedOffer

> **fallibleUnshieldedOffer**: [`UnshieldedOffer`](UnshieldedOffer.md)\<`S`\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2139

The UTXO inputs and outputs in the fallible section of this intent.

#### Throws

Writing throws if `B` is [Binding](Binding.md), unless the only change
is in the signature set.

***

### guaranteedUnshieldedOffer

> **guaranteedUnshieldedOffer**: [`UnshieldedOffer`](UnshieldedOffer.md)\<`S`\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2133

The UTXO inputs and outputs in the guaranteed section of this intent.

#### Throws

Writing throws if `B` is [Binding](Binding.md), unless the only change
is in the signature set.

***

### ttl

> **ttl**: `Date`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2154

The time this intent expires.

#### Throws

Writing throws if `B` is [Binding](Binding.md).

## Methods

### addCall()

> **addCall**(`call`): `Intent`\<`S`, [`PreProof`](PreProof.md), [`PreBinding`](PreBinding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2095

Adds a contract call to this intent.

#### Parameters

##### call

[`ContractCallPrototype`](ContractCallPrototype.md)

#### Returns

`Intent`\<`S`, [`PreProof`](PreProof.md), [`PreBinding`](PreBinding.md)\>

***

### addDeploy()

> **addDeploy**(`deploy`): `Intent`\<`S`, [`PreProof`](PreProof.md), [`PreBinding`](PreBinding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2100

Adds a contract deploy to this intent.

#### Parameters

##### deploy

[`ContractDeploy`](ContractDeploy.md)

#### Returns

`Intent`\<`S`, [`PreProof`](PreProof.md), [`PreBinding`](PreBinding.md)\>

***

### addMaintenanceUpdate()

> **addMaintenanceUpdate**(`update`): `Intent`\<`S`, [`PreProof`](PreProof.md), [`PreBinding`](PreBinding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2105

Adds a maintenance update to this intent.

#### Parameters

##### update

[`MaintenanceUpdate`](MaintenanceUpdate.md)

#### Returns

`Intent`\<`S`, [`PreProof`](PreProof.md), [`PreBinding`](PreBinding.md)\>

***

### bind()

> **bind**(`segmentId`): `Intent`\<`S`, `P`, [`Binding`](Binding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2111

Enforces binding for this intent. This is irreversible.

#### Parameters

##### segmentId

`number`

#### Returns

`Intent`\<`S`, `P`, [`Binding`](Binding.md)\>

#### Throws

If `segmentId` is not a valid segment ID.

***

### eraseProofs()

> **eraseProofs**(): `Intent`\<`S`, [`NoProof`](NoProof.md), [`NoBinding`](NoBinding.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2116

Removes proofs from this intent.

#### Returns

`Intent`\<`S`, [`NoProof`](NoProof.md), [`NoBinding`](NoBinding.md)\>

***

### eraseSignatures()

> **eraseSignatures**(): `Intent`\<[`SignatureErased`](SignatureErased.md), `P`, `B`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2121

Removes signatures from this intent.

#### Returns

`Intent`\<[`SignatureErased`](SignatureErased.md), `P`, `B`\>

***

### intentHash()

> **intentHash**(`segmentId`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2090

Returns the hash of this intent, for it's given segment ID.

#### Parameters

##### segmentId

`number`

#### Returns

`string`

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2075

#### Returns

`Uint8Array`

***

### signatureData()

> **signatureData**(`segmentId`): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2126

The raw data that is signed for unshielded inputs in this intent.

#### Parameters

##### segmentId

`number`

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2085

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`S`, `P`, `B`\>(`markerS`, `markerP`, `markerB`, `raw`): `Intent`\<`S`, `P`, `B`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2077

#### Type Parameters

##### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

##### B

`B` *extends* [`Bindingish`](../type-aliases/Bindingish.md)

#### Parameters

##### markerS

`S`\[`"instance"`\]

##### markerP

`P`\[`"instance"`\]

##### markerB

`B`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`Intent`\<`S`, `P`, `B`\>

***

### new()

> `static` **new**(`ttl`): [`UnprovenIntent`](../type-aliases/UnprovenIntent.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2073

#### Parameters

##### ttl

`Date`

#### Returns

[`UnprovenIntent`](../type-aliases/UnprovenIntent.md)

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / UnshieldedOffer

# Class: UnshieldedOffer\<S\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2163

An unshielded offer consists of inputs, outputs, and signatures that
authorize the inputs. The data the signatures sign is provided by [Intent.signatureData](Intent.md#signaturedata).

## Type Parameters

### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

## Properties

### inputs

> `readonly` **inputs**: [`UtxoSpend`](../type-aliases/UtxoSpend.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2174

***

### outputs

> `readonly` **outputs**: [`UtxoOutput`](../type-aliases/UtxoOutput.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2175

***

### signatures

> `readonly` **signatures**: `S`[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2176

## Methods

### addSignatures()

> **addSignatures**(`signatures`): `UnshieldedOffer`\<`S`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2168

#### Parameters

##### signatures

`S`[]

#### Returns

`UnshieldedOffer`\<`S`\>

***

### eraseSignatures()

> **eraseSignatures**(): `UnshieldedOffer`\<[`SignatureErased`](SignatureErased.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2170

#### Returns

`UnshieldedOffer`\<[`SignatureErased`](SignatureErased.md)\>

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2172

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### new()

> `static` **new**(`inputs`, `outputs`, `signatures`): `UnshieldedOffer`\<[`SignatureEnabled`](SignatureEnabled.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2166

#### Parameters

##### inputs

[`UtxoSpend`](../type-aliases/UtxoSpend.md)[]

##### outputs

[`UtxoOutput`](../type-aliases/UtxoOutput.md)[]

##### signatures

[`SignatureEnabled`](SignatureEnabled.md)[]

#### Returns

`UnshieldedOffer`\<[`SignatureEnabled`](SignatureEnabled.md)\>

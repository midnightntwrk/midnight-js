[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ContractCallPrototype

# Class: ContractCallPrototype

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2030

A [ContractCall](ContractCall.md) still being assembled

## Constructors

### Constructor

> **new ContractCallPrototype**(`address`, `entry_point`, `op`, `guaranteed_public_transcript`, `fallible_public_transcript`, `private_transcript_outputs`, `input`, `output`, `communication_commitment_rand`, `key_location`): `ContractCallPrototype`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2048

#### Parameters

##### address

`string`

The address being called

##### entry\_point

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

The entry point being called

##### op

[`ContractOperation`](ContractOperation.md)

The operation expected at this entry point

##### guaranteed\_public\_transcript

[`Transcript`](../type-aliases/Transcript.md)\<[`AlignedValue`](../type-aliases/AlignedValue.md)\> \| `undefined`

The guaranteed transcript computed
for this call

##### fallible\_public\_transcript

[`Transcript`](../type-aliases/Transcript.md)\<[`AlignedValue`](../type-aliases/AlignedValue.md)\> \| `undefined`

The fallible transcript computed for
this call

##### private\_transcript\_outputs

[`AlignedValue`](../type-aliases/AlignedValue.md)[]

The private transcript recorded for
this call

##### input

[`AlignedValue`](../type-aliases/AlignedValue.md)

The input(s) provided to this call

##### output

[`AlignedValue`](../type-aliases/AlignedValue.md)

The output(s) computed from this call

##### communication\_commitment\_rand

`string`

The communication randomness used
for this call

##### key\_location

`string`

An identifier for how the key for this call may be
looked up

#### Returns

`ContractCallPrototype`

## Methods

### intoCall()

> **intoCall**(`parentBinding`): [`ContractCall`](ContractCall.md)\<[`PreProof`](PreProof.md)\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2063

#### Parameters

##### parentBinding

[`PreBinding`](PreBinding.md)

#### Returns

[`ContractCall`](ContractCall.md)\<[`PreProof`](PreProof.md)\>

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2061

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

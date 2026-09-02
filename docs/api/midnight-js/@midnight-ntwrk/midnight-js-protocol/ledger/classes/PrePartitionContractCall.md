[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / PrePartitionContractCall

# Class: PrePartitionContractCall

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2012

A [ContractCall](ContractCall.md) prior to being partitioned into guarnateed and
fallible parts, for use with [Transaction.addCalls](Transaction.md#addcalls).

Note that this is similar, but not the same as [ContractCall](ContractCall.md), which
assumes [partitionTranscripts](../functions/partitionTranscripts.md) was already used. [Transaction.addCalls](Transaction.md#addcalls) is a replacement for this that also handles
Zswap components, and creates relevant intents when needed.

## Constructors

### Constructor

> **new PrePartitionContractCall**(`address`, `entry_point`, `op`, `pre_transcript`, `private_transcript_outputs`, `input`, `output`, `communication_commitment_rand`, `key_location`): `PrePartitionContractCall`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2013

#### Parameters

##### address

`string`

##### entry\_point

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

##### op

[`ContractOperation`](ContractOperation.md)

##### pre\_transcript

[`PreTranscript`](PreTranscript.md)

##### private\_transcript\_outputs

[`AlignedValue`](../type-aliases/AlignedValue.md)[]

##### input

[`AlignedValue`](../type-aliases/AlignedValue.md)

##### output

[`AlignedValue`](../type-aliases/AlignedValue.md)

##### communication\_commitment\_rand

`string`

##### key\_location

`string`

#### Returns

`PrePartitionContractCall`

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2024

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

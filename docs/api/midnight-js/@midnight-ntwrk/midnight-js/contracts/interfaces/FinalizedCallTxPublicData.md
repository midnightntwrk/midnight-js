[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FinalizedCallTxPublicData

# Interface: FinalizedCallTxPublicData

Defined in: packages/contracts/dist/index.d.ts:654

The public data of a finalized call transaction: the circuit execution's
public result ([CallResultPublic](CallResultPublic.md)) combined with the finalized
transaction data ([FinalizedTxData](../../types/interfaces/FinalizedTxData.md)).

## Extends

- [`CallResultPublic`](CallResultPublic.md).[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

Defined in: packages/types/dist/index.d.ts:223

The author of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`blockAuthor`](../../types/interfaces/FinalizedTxData.md#blockauthor)

***

### blockHash

> `readonly` **blockHash**: `string`

Defined in: packages/types/dist/index.d.ts:211

The block hash of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`blockHash`](../../types/interfaces/FinalizedTxData.md#blockhash)

***

### blockHeight

> `readonly` **blockHeight**: `number`

Defined in: packages/types/dist/index.d.ts:215

The block height of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`blockHeight`](../../types/interfaces/FinalizedTxData.md#blockheight)

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

Defined in: packages/types/dist/index.d.ts:219

The timestamp of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`blockTimestamp`](../../types/interfaces/FinalizedTxData.md#blocktimestamp)

***

### fees

> `readonly` **fees**: [`Fees`](../../types/type-aliases/Fees.md)

Defined in: packages/types/dist/index.d.ts:235

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`fees`](../../types/interfaces/FinalizedTxData.md#fees)

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

Defined in: packages/types/dist/index.d.ts:203

All transaction IDs of the submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`identifiers`](../../types/interfaces/FinalizedTxData.md#identifiers)

***

### indexerId

> `readonly` **indexerId**: `number`

Defined in: packages/types/dist/index.d.ts:227

The indexer internal db ID.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`indexerId`](../../types/interfaces/FinalizedTxData.md#indexerid)

***

### logEvents

> `readonly` **logEvents**: readonly [`LogEvent`](../type-aliases/LogEvent.md)[]

Defined in: packages/contracts/dist/index.d.ts:151

The MIP-0002 contract log events emitted during circuit execution. Surfaced on the `compact-js`
executor result and typed by `compact-runtime`'s [LogEvent](../type-aliases/LogEvent.md). This is the single
execution-wide list across the whole call tree (not just the root call), in emission order; each
event is tagged with its emitting contract's address, so a per-contract view is a filter over
that address.

Events are carried **raw** — decode on demand with `ContractLog.decodeAll` (re-exported from
this package). The decoder degrades gracefully and never throws, but it is `@experimental`: a
successful decode can still yield a silently-wrong payload, so treat decoded values with care.
Empty when the circuit emits no logs.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`logEvents`](CallResultPublic.md#logevents)

***

### nextContractState

> `readonly` **nextContractState**: [`StateValue`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:127

The public state resulting from executing the circuit.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`nextContractState`](CallResultPublic.md#nextcontractstate)

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: [`PartitionedTranscript`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:138

A [publicTranscript](CallResultPublic.md#publictranscript) partitioned into guaranteed and fallible sections.
The guaranteed section of a public transcript must succeed for the corresponding
transaction to be considered valid. The fallible section of a public transcript
can fail without invalidating the transaction, as long as the guaranteed section succeeds.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`partitionedTranscript`](CallResultPublic.md#partitionedtranscript)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

Defined in: packages/types/dist/index.d.ts:231

The protocol version of the transaction.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`protocolVersion`](../../types/interfaces/FinalizedTxData.md#protocolversion)

***

### publicTranscript

> `readonly` **publicTranscript**: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]

Defined in: packages/contracts/dist/index.d.ts:131

The public transcript resulting from executing the circuit.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`publicTranscript`](CallResultPublic.md#publictranscript)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../../types/type-aliases/SegmentStatus.md)\> \| `undefined`

Defined in: packages/types/dist/index.d.ts:240

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../../types/type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`segmentStatusMap`](../../types/interfaces/FinalizedTxData.md#segmentstatusmap)

***

### status

> `readonly` **status**: [`TxStatus`](../../types/type-aliases/TxStatus.md)

Defined in: packages/types/dist/index.d.ts:195

The status of a submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`status`](../../types/interfaces/FinalizedTxData.md#status)

***

### tx

> `readonly` **tx**: [`Transaction`](../../types/classes/Transaction.md)\<[`SignatureEnabled`](https://github.com/midnightntwrk/midnight-ledger), [`Proof`](https://github.com/midnightntwrk/midnight-ledger), [`Binding`](https://github.com/midnightntwrk/midnight-ledger)\>

Defined in: packages/types/dist/index.d.ts:191

The transaction that was finalized.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`tx`](../../types/interfaces/FinalizedTxData.md#tx)

***

### txHash

> `readonly` **txHash**: `string`

Defined in: packages/types/dist/index.d.ts:207

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`txHash`](../../types/interfaces/FinalizedTxData.md#txhash)

***

### txId

> `readonly` **txId**: `string`

Defined in: packages/types/dist/index.d.ts:199

One of the transaction ID of the submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`txId`](../../types/interfaces/FinalizedTxData.md#txid)

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../../types/type-aliases/UnshieldedUtxos.md)

Defined in: packages/types/dist/index.d.ts:245

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`unshielded`](../../types/interfaces/FinalizedTxData.md#unshielded)

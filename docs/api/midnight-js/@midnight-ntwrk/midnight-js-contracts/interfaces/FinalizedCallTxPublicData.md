[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / FinalizedCallTxPublicData

# Interface: FinalizedCallTxPublicData

The public data of a finalized call transaction: the circuit execution's
public result ([CallResultPublic](CallResultPublic.md)) combined with the finalized
transaction data ([FinalizedTxData](../../midnight-js/types/interfaces/FinalizedTxData.md)).

## Extends

- [`CallResultPublic`](CallResultPublic.md).[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

The author of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`blockAuthor`](../../midnight-js/types/interfaces/FinalizedTxData.md#blockauthor)

***

### blockHash

> `readonly` **blockHash**: `string`

The block hash of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`blockHash`](../../midnight-js/types/interfaces/FinalizedTxData.md#blockhash)

***

### blockHeight

> `readonly` **blockHeight**: `number`

The block height of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`blockHeight`](../../midnight-js/types/interfaces/FinalizedTxData.md#blockheight)

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

The timestamp of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`blockTimestamp`](../../midnight-js/types/interfaces/FinalizedTxData.md#blocktimestamp)

***

### fees

> `readonly` **fees**: [`Fees`](../../midnight-js/types/type-aliases/Fees.md)

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`fees`](../../midnight-js/types/interfaces/FinalizedTxData.md#fees)

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

All transaction IDs of the submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`identifiers`](../../midnight-js/types/interfaces/FinalizedTxData.md#identifiers)

***

### indexerId

> `readonly` **indexerId**: `number`

The indexer internal db ID.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`indexerId`](../../midnight-js/types/interfaces/FinalizedTxData.md#indexerid)

***

### logEvents

> `readonly` **logEvents**: readonly [`LogEvent`](../../midnight-js/contracts/type-aliases/LogEvent.md)[]

The MIP-0002 contract log events emitted during circuit execution. Surfaced on the `compact-js`
executor result and typed by `compact-runtime`'s [LogEvent](../../midnight-js/contracts/type-aliases/LogEvent.md). This is the single
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

The public state resulting from executing the circuit.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`nextContractState`](CallResultPublic.md#nextcontractstate)

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: [`PartitionedTranscript`](https://github.com/midnightntwrk/midnight-ledger)

A [publicTranscript](CallResultPublic.md#publictranscript) partitioned into guaranteed and fallible sections.
The guaranteed section of a public transcript must succeed for the corresponding
transaction to be considered valid. The fallible section of a public transcript
can fail without invalidating the transaction, as long as the guaranteed section succeeds.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`partitionedTranscript`](CallResultPublic.md#partitionedtranscript)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol version of the transaction.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`protocolVersion`](../../midnight-js/types/interfaces/FinalizedTxData.md#protocolversion)

***

### publicTranscript

> `readonly` **publicTranscript**: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]

The public transcript resulting from executing the circuit.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`publicTranscript`](CallResultPublic.md#publictranscript)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../../midnight-js/types/type-aliases/SegmentStatus.md)\> \| `undefined`

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../../midnight-js/types/type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`segmentStatusMap`](../../midnight-js/types/interfaces/FinalizedTxData.md#segmentstatusmap)

***

### status

> `readonly` **status**: [`TxStatus`](../../midnight-js/types/type-aliases/TxStatus.md)

The status of a submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`status`](../../midnight-js/types/interfaces/FinalizedTxData.md#status)

***

### tx

> `readonly` **tx**: [`Transaction`](../../midnight-js/types/classes/Transaction.md)\<[`SignatureEnabled`](https://github.com/midnightntwrk/midnight-ledger), [`Proof`](https://github.com/midnightntwrk/midnight-ledger), [`Binding`](https://github.com/midnightntwrk/midnight-ledger)\>

The transaction that was finalized.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`tx`](../../midnight-js/types/interfaces/FinalizedTxData.md#tx)

***

### txHash

> `readonly` **txHash**: `string`

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`txHash`](../../midnight-js/types/interfaces/FinalizedTxData.md#txhash)

***

### txId

> `readonly` **txId**: `string`

One of the transaction ID of the submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`txId`](../../midnight-js/types/interfaces/FinalizedTxData.md#txid)

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../../midnight-js/types/type-aliases/UnshieldedUtxos.md)

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

[`FinalizedTxData`](../../midnight-js/types/interfaces/FinalizedTxData.md).[`unshielded`](../../midnight-js/types/interfaces/FinalizedTxData.md#unshielded)

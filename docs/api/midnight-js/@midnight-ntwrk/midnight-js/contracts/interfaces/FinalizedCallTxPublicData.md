[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FinalizedCallTxPublicData

# Interface: FinalizedCallTxPublicData

The public data of a finalized call transaction: the circuit execution's
public result ([CallResultPublic](CallResultPublic.md)) combined with the finalized
transaction data ([FinalizedTxData](../../types/interfaces/FinalizedTxData.md)).

## Extends

- [`CallResultPublic`](CallResultPublic.md).[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

The author of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`blockAuthor`](../../types/interfaces/FinalizedTxData.md#blockauthor)

***

### blockHash

> `readonly` **blockHash**: `string`

The block hash of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`blockHash`](../../types/interfaces/FinalizedTxData.md#blockhash)

***

### blockHeight

> `readonly` **blockHeight**: `number`

The block height of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`blockHeight`](../../types/interfaces/FinalizedTxData.md#blockheight)

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

The timestamp of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`blockTimestamp`](../../types/interfaces/FinalizedTxData.md#blocktimestamp)

***

### fees

> `readonly` **fees**: [`Fees`](../../types/type-aliases/Fees.md)

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`fees`](../../types/interfaces/FinalizedTxData.md#fees)

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

All transaction IDs of the submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`identifiers`](../../types/interfaces/FinalizedTxData.md#identifiers)

***

### indexerId

> `readonly` **indexerId**: `number`

The indexer internal db ID.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`indexerId`](../../types/interfaces/FinalizedTxData.md#indexerid)

***

### logEvents

> `readonly` **logEvents**: readonly [`LogEvent`](https://github.com/LFDT-Minokawa/compact)[]

The MIP-0002 contract log events emitted during circuit execution. Surfaced on the `compact-js`
executor result and typed by `compact-runtime`'s [LogEvent](https://github.com/LFDT-Minokawa/compact). This is the single
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

### nextContractStateEncoded

> `readonly` **nextContractStateEncoded**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

The same state as an [EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger): the form that survives this
process, a `structuredClone`, a worker transfer and storage.

The handle above is valid only while the runtime instance that produced it
is loaded -- anything that walks it sees `__wbg_ptr`, an integer that means
nothing outside its module. `EncodedStateValue` is pinned identical across
`onchain-runtime-v3`, `ledger-v8` and `ledger-v9`, so this is the member
era-agnostic code reads and the one to persist, in either era.

Derived from the handle rather than fetched again, so the two cannot
describe different states. It costs one encode per call; read
[CallResultPublic.nextContractState](CallResultPublic.md#nextcontractstate) instead when the value never
leaves the process that produced it.

#### See

ADR-0010 for the decision to publish the handle AND the bytes.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`nextContractStateEncoded`](CallResultPublic.md#nextcontractstateencoded)

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: [`PartitionedTranscript`](https://github.com/midnightntwrk/midnight-ledger)

The public transcript partitioned into its guaranteed and fallible halves.
The guaranteed half must succeed for the transaction to be valid; the
fallible half may fail without invalidating it.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`partitionedTranscript`](CallResultPublic.md#partitionedtranscript)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol version of the transaction.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`protocolVersion`](../../types/interfaces/FinalizedTxData.md#protocolversion)

***

### publicTranscript

> `readonly` **publicTranscript**: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]

The public transcript the execution produced, unpartitioned.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`publicTranscript`](CallResultPublic.md#publictranscript)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../../types/type-aliases/SegmentStatus.md)\> \| `undefined`

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../../types/type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`segmentStatusMap`](../../types/interfaces/FinalizedTxData.md#segmentstatusmap)

***

### status

> `readonly` **status**: [`TxStatus`](../../types/type-aliases/TxStatus.md)

The status of a submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`status`](../../types/interfaces/FinalizedTxData.md#status)

***

### tx

> `readonly` **tx**: [`Transaction`](https://github.com/midnightntwrk/midnight-ledger)\<[`SignatureEnabled`](https://github.com/midnightntwrk/midnight-ledger), [`Proof`](https://github.com/midnightntwrk/midnight-ledger), [`Binding`](https://github.com/midnightntwrk/midnight-ledger)\>

The transaction that was finalized.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`tx`](../../types/interfaces/FinalizedTxData.md#tx)

***

### txHash

> `readonly` **txHash**: `string`

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`txHash`](../../types/interfaces/FinalizedTxData.md#txhash)

***

### txId

> `readonly` **txId**: `string`

One of the transaction ID of the submitted transaction.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`txId`](../../types/interfaces/FinalizedTxData.md#txid)

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../../types/type-aliases/UnshieldedUtxos.md)

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`unshielded`](../../types/interfaces/FinalizedTxData.md#unshielded)

***

### version

> `readonly` **version**: `"v9"`

Discriminant identifying this as a v9 ledger record.

#### Inherited from

[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md).[`version`](../../types/interfaces/FinalizedTxData.md#version)

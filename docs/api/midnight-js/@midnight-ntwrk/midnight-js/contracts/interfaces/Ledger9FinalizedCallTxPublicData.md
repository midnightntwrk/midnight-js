[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9FinalizedCallTxPublicData

# Interface: Ledger9FinalizedCallTxPublicData

The public data of a finalized call transaction: the circuit execution's
public result ([Ledger9CallResultPublic](Ledger9CallResultPublic.md)) combined with the finalized
transaction data ([Ledger9FinalizedTxData](../../types/interfaces/Ledger9FinalizedTxData.md)).

## Extends

- [`Ledger9CallResultPublic`](Ledger9CallResultPublic.md).[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

The author of the block in which the transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`blockAuthor`](../../types/interfaces/Ledger9FinalizedTxData.md#blockauthor)

***

### blockHash

> `readonly` **blockHash**: `string`

The block hash of the block in which the transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`blockHash`](../../types/interfaces/Ledger9FinalizedTxData.md#blockhash)

***

### blockHeight

> `readonly` **blockHeight**: `number`

The block height of the block in which the transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`blockHeight`](../../types/interfaces/Ledger9FinalizedTxData.md#blockheight)

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

The timestamp of the block in which the transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`blockTimestamp`](../../types/interfaces/Ledger9FinalizedTxData.md#blocktimestamp)

***

### era

> `readonly` **era**: `"v9"`

Discriminant identifying this as a v9 ledger record.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`era`](../../types/interfaces/Ledger9FinalizedTxData.md#era)

***

### fees

> `readonly` **fees**: [`Fees`](../../types/type-aliases/Fees.md)

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`fees`](../../types/interfaces/Ledger9FinalizedTxData.md#fees)

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

All transaction IDs of the submitted transaction.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`identifiers`](../../types/interfaces/Ledger9FinalizedTxData.md#identifiers)

***

### indexerId

> `readonly` **indexerId**: `number`

The indexer internal db ID.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`indexerId`](../../types/interfaces/Ledger9FinalizedTxData.md#indexerid)

***

### logEvents

> `readonly` **logEvents**: readonly [`LogEvent`](https://github.com/LFDT-Minokawa/compact)[]

The MIP-0002 contract log events emitted during circuit execution. Surfaced on the `compact-js`
executor result and typed by `compact-runtime`'s `LogEvent`, published here as `Ledger9LogEvent`. This is the single
execution-wide list across the whole call tree (not just the root call), in emission order; each
event is tagged with its emitting contract's address, so a per-contract view is a filter over
that address.

Events are carried **raw** — decode on demand with `Ledger9ContractLog.decodeAll` (re-exported from
this package). The decoder degrades gracefully and never throws, but it is `@experimental`: a
successful decode can still yield a silently-wrong payload, so treat decoded values with care.
Empty when the circuit emits no logs.

#### Inherited from

[`Ledger9CallResultPublic`](Ledger9CallResultPublic.md).[`logEvents`](Ledger9CallResultPublic.md#logevents)

***

### nextContractState

> `readonly` **nextContractState**: [`StateValue`](https://github.com/midnightntwrk/midnight-ledger)

The public state resulting from executing the circuit.

#### Inherited from

[`Ledger9CallResultPublic`](Ledger9CallResultPublic.md).[`nextContractState`](Ledger9CallResultPublic.md#nextcontractstate)

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
[Ledger9CallResultPublic.nextContractState](Ledger9CallResultPublic.md#nextcontractstate) instead when the value never
leaves the process that produced it.

#### See

ADR-0010 for the decision to publish the handle AND the bytes.

#### Inherited from

[`Ledger9CallResultPublic`](Ledger9CallResultPublic.md).[`nextContractStateEncoded`](Ledger9CallResultPublic.md#nextcontractstateencoded)

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: [`PartitionedTranscript`](https://github.com/midnightntwrk/midnight-ledger)

The public transcript partitioned into its guaranteed and fallible halves.
The guaranteed half must succeed for the transaction to be valid; the
fallible half may fail without invalidating it.

#### Inherited from

[`Ledger9CallResultPublic`](Ledger9CallResultPublic.md).[`partitionedTranscript`](Ledger9CallResultPublic.md#partitionedtranscript)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol version of the transaction.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`protocolVersion`](../../types/interfaces/Ledger9FinalizedTxData.md#protocolversion)

***

### publicTranscript

> `readonly` **publicTranscript**: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]

The public transcript the execution produced, unpartitioned.

#### Inherited from

[`Ledger9CallResultPublic`](Ledger9CallResultPublic.md).[`publicTranscript`](Ledger9CallResultPublic.md#publictranscript)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../../types/type-aliases/SegmentStatus.md)\> \| `undefined`

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../../types/type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`segmentStatusMap`](../../types/interfaces/Ledger9FinalizedTxData.md#segmentstatusmap)

***

### status

> `readonly` **status**: [`TxStatus`](../../types/type-aliases/TxStatus.md)

The status of a submitted transaction.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`status`](../../types/interfaces/Ledger9FinalizedTxData.md#status)

***

### tx

> `readonly` **tx**: [`LedgerTransaction`](../../types/classes/LedgerTransaction.md)\<`"Finalized"`, `"v9"`\>

The transaction that was finalized, as a v9 handle.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`tx`](../../types/interfaces/Ledger9FinalizedTxData.md#tx)

***

### txHash

> `readonly` **txHash**: `string`

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`txHash`](../../types/interfaces/Ledger9FinalizedTxData.md#txhash)

***

### txId

> `readonly` **txId**: `string`

One of the transaction ID of the submitted transaction.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`txId`](../../types/interfaces/Ledger9FinalizedTxData.md#txid)

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../../types/type-aliases/UnshieldedUtxos.md)

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

[`Ledger9FinalizedTxData`](../../types/interfaces/Ledger9FinalizedTxData.md).[`unshielded`](../../types/interfaces/Ledger9FinalizedTxData.md#unshielded)

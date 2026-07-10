[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / FinalizedCallTxPublicData

# Interface: FinalizedCallTxPublicData

The public data of a finalized call transaction: the circuit execution's
public result ([CallResultPublic](CallResultPublic.md)) combined with the finalized
transaction data (FinalizedTxData).

## Extends

- [`CallResultPublic`](CallResultPublic.md).`FinalizedTxData`

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

The author of the block in which the transaction was included.

#### Inherited from

`FinalizedTxData.blockAuthor`

***

### blockHash

> `readonly` **blockHash**: `string`

The block hash of the block in which the transaction was included.

#### Inherited from

`FinalizedTxData.blockHash`

***

### blockHeight

> `readonly` **blockHeight**: `number`

The block height of the block in which the transaction was included.

#### Inherited from

`FinalizedTxData.blockHeight`

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

The timestamp of the block in which the transaction was included.

#### Inherited from

`FinalizedTxData.blockTimestamp`

***

### fees

> `readonly` **fees**: `Fees`

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

`FinalizedTxData.fees`

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

All transaction IDs of the submitted transaction.

#### Inherited from

`FinalizedTxData.identifiers`

***

### indexerId

> `readonly` **indexerId**: `number`

The indexer internal db ID.

#### Inherited from

`FinalizedTxData.indexerId`

***

### logEvents

> `readonly` **logEvents**: readonly `LogEvent`[]

The MIP-0002 contract log events emitted during circuit execution. Surfaced on the `compact-js`
executor result and typed by `compact-runtime`'s LogEvent. This is the single
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

> `readonly` **nextContractState**: `StateValue`

The public state resulting from executing the circuit.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`nextContractState`](CallResultPublic.md#nextcontractstate)

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: `PartitionedTranscript`

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

`FinalizedTxData.protocolVersion`

***

### publicTranscript

> `readonly` **publicTranscript**: `Op`\<`AlignedValue`\>[]

The public transcript resulting from executing the circuit.

#### Inherited from

[`CallResultPublic`](CallResultPublic.md).[`publicTranscript`](CallResultPublic.md#publictranscript)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, `SegmentStatus`\> \| `undefined`

The map that associates segment identifiers (numbers) with their corresponding status SegmentStatus.
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

`FinalizedTxData.segmentStatusMap`

***

### status

> `readonly` **status**: `TxStatus`

The status of a submitted transaction.

#### Inherited from

`FinalizedTxData.status`

***

### tx

> `readonly` **tx**: `Transaction`\<`SignatureEnabled`, `Proof`, `Binding`\>

The transaction that was finalized.

#### Inherited from

`FinalizedTxData.tx`

***

### txHash

> `readonly` **txHash**: `string`

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

`FinalizedTxData.txHash`

***

### txId

> `readonly` **txId**: `string`

One of the transaction ID of the submitted transaction.

#### Inherited from

`FinalizedTxData.txId`

***

### unshielded

> `readonly` **unshielded**: `UnshieldedUtxos`

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

`FinalizedTxData.unshielded`

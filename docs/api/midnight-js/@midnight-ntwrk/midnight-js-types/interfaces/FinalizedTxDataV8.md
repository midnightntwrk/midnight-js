[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / FinalizedTxDataV8

# Interface: FinalizedTxDataV8

The v8 arm of [VersionedFinalizedTxData](../type-aliases/VersionedFinalizedTxData.md). Carries the same
finalized-transaction metadata as [FinalizedTxData](FinalizedTxData.md) — both arms extend
[FinalizedTxRecord](FinalizedTxRecord.md) — with a v8 ledger transaction object in place of
the v9 one.

`version` is derived from the record's own `protocolVersion` by the provider
that builds it, so this shape is only produced for a record that resolves to
the v8 ledger runtime.

A provider that decodes per era produces this arm for any record whose
`protocolVersion` places it in the v8 era. A consumer that narrows on
`version` therefore has to handle it: it is a value the read surface really
returns, not a placeholder. Contract-STATE reads are a separate question and
remain v9-only — see the provider's own documentation.

## Extends

- [`FinalizedTxRecord`](FinalizedTxRecord.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

The author of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`blockAuthor`](FinalizedTxRecord.md#blockauthor)

***

### blockHash

> `readonly` **blockHash**: `string`

The block hash of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`blockHash`](FinalizedTxRecord.md#blockhash)

***

### blockHeight

> `readonly` **blockHeight**: `number`

The block height of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`blockHeight`](FinalizedTxRecord.md#blockheight)

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

The timestamp of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`blockTimestamp`](FinalizedTxRecord.md#blocktimestamp)

***

### fees

> `readonly` **fees**: [`Fees`](../type-aliases/Fees.md)

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`fees`](FinalizedTxRecord.md#fees)

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

All transaction IDs of the submitted transaction.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`identifiers`](FinalizedTxRecord.md#identifiers)

***

### indexerId

> `readonly` **indexerId**: `number`

The indexer internal db ID.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`indexerId`](FinalizedTxRecord.md#indexerid)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol version of the transaction.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`protocolVersion`](FinalizedTxRecord.md#protocolversion)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../type-aliases/SegmentStatus.md)\> \| `undefined`

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`segmentStatusMap`](FinalizedTxRecord.md#segmentstatusmap)

***

### status

> `readonly` **status**: [`TxStatus`](../type-aliases/TxStatus.md)

The status of a submitted transaction.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`status`](FinalizedTxRecord.md#status)

***

### tx

> `readonly` **tx**: `FinalizedTransaction`

***

### txHash

> `readonly` **txHash**: `string`

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`txHash`](FinalizedTxRecord.md#txhash)

***

### txId

> `readonly` **txId**: `string`

One of the transaction ID of the submitted transaction.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`txId`](FinalizedTxRecord.md#txid)

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../type-aliases/UnshieldedUtxos.md)

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

[`FinalizedTxRecord`](FinalizedTxRecord.md).[`unshielded`](FinalizedTxRecord.md#unshielded)

***

### version

> `readonly` **version**: `"v8"`

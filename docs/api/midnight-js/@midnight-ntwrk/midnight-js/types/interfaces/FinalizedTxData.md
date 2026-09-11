[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / FinalizedTxData

# Interface: FinalizedTxData

Data for any finalized transaction produced by the v9 ledger runtime.

This is the v9 arm of [VersionedFinalizedTxData](../type-aliases/VersionedFinalizedTxData.md) — see
[FinalizedTxDataV8](FinalizedTxDataV8.md) for the v8 arm. The providers in this framework
derive `version` from the record's own `protocolVersion`, using the
`read`-path resolver in `@midnight-ntwrk/midnight-js-protocol`, and throw
rather than mislabel a record from an era they cannot decode — so from them,
`version` is a statement about the record rather than an assumption. A
third-party `PublicDataProvider` is not obliged to do the same.

Narrowing is required: a provider that decodes per era returns the v8 arm as
a value for any record whose `protocolVersion` places it in that era.

## Extends

- [`FinalizedTxRecord`](FinalizedTxRecord.md)

## Extended by

- [`FinalizedCallTxPublicData`](../../contracts/interfaces/FinalizedCallTxPublicData.md)
- [`FinalizedDeployTxPublicData`](../../contracts/interfaces/FinalizedDeployTxPublicData.md)
- [`FinalizedCallTxPublicData`](../../../midnight-js-contracts/index/interfaces/FinalizedCallTxPublicData.md)
- [`FinalizedDeployTxPublicData`](../../../midnight-js-contracts/index/interfaces/FinalizedDeployTxPublicData.md)

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

> `readonly` **tx**: [`Transaction`](https://github.com/midnightntwrk/midnight-ledger)\<[`SignatureEnabled`](https://github.com/midnightntwrk/midnight-ledger), [`Proof`](https://github.com/midnightntwrk/midnight-ledger), [`Binding`](https://github.com/midnightntwrk/midnight-ledger)\>

The transaction that was finalized.

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

> `readonly` **version**: `"v9"`

Discriminant identifying this as a v9 ledger record.

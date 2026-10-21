[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8FoundDeployTxPublicData

# Interface: Ledger8FoundDeployTxPublicData

The public data of a deployment found on chain whose deploy transaction was
recorded by the ledger-8 runtime, i.e. a contract deployed before the ledger fork.

Carries no `initialContractState`: the deploy-time state of a ledger-8 contract
cannot be decoded by the current runtime. Read the current state with
`PublicDataProvider.queryContractState`.

## Remarks

Published flat, not under the `Ledger8` namespace: it is part of the
current era's `FoundDeployTxData`, and outlives the retained pipeline.

## See

[RetainedEraNamespace](../../documents/RetainedEraNamespace.md) for which names the namespace holds.

## Extends

- [`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

The author of the block in which the transaction was included.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`blockAuthor`](../../types/interfaces/Ledger8FinalizedTxData.md#blockauthor)

***

### blockHash

> `readonly` **blockHash**: `string`

The block hash of the block in which the transaction was included.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`blockHash`](../../types/interfaces/Ledger8FinalizedTxData.md#blockhash)

***

### blockHeight

> `readonly` **blockHeight**: `number`

The block height of the block in which the transaction was included.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`blockHeight`](../../types/interfaces/Ledger8FinalizedTxData.md#blockheight)

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

The timestamp of the block in which the transaction was included.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`blockTimestamp`](../../types/interfaces/Ledger8FinalizedTxData.md#blocktimestamp)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address of the contract that was deployed.

***

### fees

> `readonly` **fees**: [`Fees`](../../types/type-aliases/Fees.md)

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`fees`](../../types/interfaces/Ledger8FinalizedTxData.md#fees)

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

All transaction IDs of the submitted transaction.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`identifiers`](../../types/interfaces/Ledger8FinalizedTxData.md#identifiers)

***

### indexerId

> `readonly` **indexerId**: `number`

The indexer internal db ID.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`indexerId`](../../types/interfaces/Ledger8FinalizedTxData.md#indexerid)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol version of the transaction.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`protocolVersion`](../../types/interfaces/Ledger8FinalizedTxData.md#protocolversion)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../../types/type-aliases/SegmentStatus.md)\> \| `undefined`

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../../types/type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`segmentStatusMap`](../../types/interfaces/Ledger8FinalizedTxData.md#segmentstatusmap)

***

### status

> `readonly` **status**: [`TxStatus`](../../types/type-aliases/TxStatus.md)

The status of a submitted transaction.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`status`](../../types/interfaces/Ledger8FinalizedTxData.md#status)

***

### tx

> `readonly` **tx**: `FinalizedTransaction`

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`tx`](../../types/interfaces/Ledger8FinalizedTxData.md#tx)

***

### txHash

> `readonly` **txHash**: `string`

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`txHash`](../../types/interfaces/Ledger8FinalizedTxData.md#txhash)

***

### txId

> `readonly` **txId**: `string`

One of the transaction ID of the submitted transaction.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`txId`](../../types/interfaces/Ledger8FinalizedTxData.md#txid)

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../../types/type-aliases/UnshieldedUtxos.md)

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`unshielded`](../../types/interfaces/Ledger8FinalizedTxData.md#unshielded)

***

### version

> `readonly` **version**: `"v8"`

#### Inherited from

[`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md).[`version`](../../types/interfaces/Ledger8FinalizedTxData.md#version)

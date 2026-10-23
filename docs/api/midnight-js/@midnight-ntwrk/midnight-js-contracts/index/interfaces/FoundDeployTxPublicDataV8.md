[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / FoundDeployTxPublicDataV8

# Interface: FoundDeployTxPublicDataV8

The public data of a deployment found on chain whose deploy transaction was
recorded by the ledger-8 runtime, i.e. a contract deployed before the ledger fork.

Carries no `initialContractState`: the deploy-time state of a ledger-8 contract
cannot be decoded by the current runtime. Read the current state with
`PublicDataProvider.queryContractState`.

## Extends

- [`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

The author of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`blockAuthor`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#blockauthor)

***

### blockHash

> `readonly` **blockHash**: `string`

The block hash of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`blockHash`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#blockhash)

***

### blockHeight

> `readonly` **blockHeight**: `number`

The block height of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`blockHeight`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#blockheight)

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

The timestamp of the block in which the transaction was included.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`blockTimestamp`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#blocktimestamp)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address of the contract that was deployed.

***

### fees

> `readonly` **fees**: [`Fees`](../../../midnight-js/types/type-aliases/Fees.md)

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`fees`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#fees)

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

All transaction IDs of the submitted transaction.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`identifiers`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#identifiers)

***

### indexerId

> `readonly` **indexerId**: `number`

The indexer internal db ID.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`indexerId`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#indexerid)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol version of the transaction.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`protocolVersion`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#protocolversion)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../../../midnight-js/types/type-aliases/SegmentStatus.md)\> \| `undefined`

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../../../midnight-js/types/type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`segmentStatusMap`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#segmentstatusmap)

***

### status

> `readonly` **status**: [`TxStatus`](../../../midnight-js/types/type-aliases/TxStatus.md)

The status of a submitted transaction.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`status`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#status)

***

### tx

> `readonly` **tx**: `FinalizedTransaction`

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`tx`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#tx)

***

### txHash

> `readonly` **txHash**: `string`

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`txHash`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#txhash)

***

### txId

> `readonly` **txId**: `string`

One of the transaction ID of the submitted transaction.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`txId`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#txid)

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../../../midnight-js/types/type-aliases/UnshieldedUtxos.md)

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`unshielded`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#unshielded)

***

### version

> `readonly` **version**: `"v8"`

#### Inherited from

[`FinalizedTxDataV8`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md).[`version`](../../../midnight-js/types/interfaces/FinalizedTxDataV8.md#version)

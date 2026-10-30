[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9FinalizedDeployTxPublicData

# Interface: Ledger9FinalizedDeployTxPublicData

The public data of a finalized deployment transaction: the deploy-specific
public data ([Ledger9UnsubmittedDeployTxPublicData](Ledger9UnsubmittedDeployTxPublicData.md)) combined with the
finalized transaction data ([Ledger9FinalizedTxData](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md)).

## Extends

- [`Ledger9UnsubmittedDeployTxPublicData`](Ledger9UnsubmittedDeployTxPublicData.md).[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

The author of the block in which the transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`blockAuthor`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#blockauthor)

***

### blockHash

> `readonly` **blockHash**: `string`

The block hash of the block in which the transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`blockHash`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#blockhash)

***

### blockHeight

> `readonly` **blockHeight**: `number`

The block height of the block in which the transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`blockHeight`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#blockheight)

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

The timestamp of the block in which the transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`blockTimestamp`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#blocktimestamp)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address of the contract that was deployed.

#### Inherited from

[`Ledger9UnsubmittedDeployTxPublicData`](Ledger9UnsubmittedDeployTxPublicData.md).[`contractAddress`](Ledger9UnsubmittedDeployTxPublicData.md#contractaddress)

***

### era

> `readonly` **era**: `"v9"`

Discriminant identifying this as a v9 ledger record.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`era`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#era)

***

### fees

> `readonly` **fees**: [`Fees`](../../../midnight-js/types/type-aliases/Fees.md)

The fees associated with the transaction, including both paid and estimated fees.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`fees`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#fees)

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

All transaction IDs of the submitted transaction.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`identifiers`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#identifiers)

***

### indexerId

> `readonly` **indexerId**: `number`

The indexer internal db ID.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`indexerId`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#indexerid)

***

### initialContractState

> `readonly` **initialContractState**: [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

The initial public state of the contract deployed to the blockchain.

#### Inherited from

[`Ledger9UnsubmittedDeployTxPublicData`](Ledger9UnsubmittedDeployTxPublicData.md).[`initialContractState`](Ledger9UnsubmittedDeployTxPublicData.md#initialcontractstate)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol version of the transaction.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`protocolVersion`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#protocolversion)

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../../../midnight-js/types/type-aliases/SegmentStatus.md)\> \| `undefined`

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../../../midnight-js/types/type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`segmentStatusMap`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#segmentstatusmap)

***

### status

> `readonly` **status**: [`TxStatus`](../../../midnight-js/types/type-aliases/TxStatus.md)

The status of a submitted transaction.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`status`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#status)

***

### tx

> `readonly` **tx**: [`LedgerTransaction`](../../../midnight-js/types/classes/LedgerTransaction.md)\<`"Finalized"`, `"v9"`\>

The transaction that was finalized, as a v9 handle.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`tx`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#tx)

***

### txHash

> `readonly` **txHash**: `string`

The transaction hash of the transaction in which the original transaction was included.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`txHash`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#txhash)

***

### txId

> `readonly` **txId**: `string`

One of the transaction ID of the submitted transaction.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`txId`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#txid)

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../../../midnight-js/types/type-aliases/UnshieldedUtxos.md)

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

#### Inherited from

[`Ledger9FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md).[`unshielded`](../../../midnight-js/types/interfaces/Ledger9FinalizedTxData.md#unshielded)

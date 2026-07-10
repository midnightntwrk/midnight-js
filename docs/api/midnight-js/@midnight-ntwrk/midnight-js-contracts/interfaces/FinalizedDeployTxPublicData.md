[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / FinalizedDeployTxPublicData

# Interface: FinalizedDeployTxPublicData

The public data of a finalized deployment transaction: the deploy-specific
public data ([UnsubmittedDeployTxPublicData](UnsubmittedDeployTxPublicData.md)) combined with the
finalized transaction data (FinalizedTxData).

## Extends

- [`UnsubmittedDeployTxPublicData`](UnsubmittedDeployTxPublicData.md).`FinalizedTxData`

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

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address of the contract that was deployed.

#### Inherited from

[`UnsubmittedDeployTxPublicData`](UnsubmittedDeployTxPublicData.md).[`contractAddress`](UnsubmittedDeployTxPublicData.md#contractaddress)

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

### initialContractState

> `readonly` **initialContractState**: `ContractState`

The initial public state of the contract deployed to the blockchain.

#### Inherited from

[`UnsubmittedDeployTxPublicData`](UnsubmittedDeployTxPublicData.md).[`initialContractState`](UnsubmittedDeployTxPublicData.md#initialcontractstate)

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol version of the transaction.

#### Inherited from

`FinalizedTxData.protocolVersion`

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

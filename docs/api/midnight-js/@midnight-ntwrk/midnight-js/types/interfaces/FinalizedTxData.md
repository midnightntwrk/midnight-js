[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / FinalizedTxData

# Interface: FinalizedTxData

Defined in: packages/types/dist/index.d.ts:187

Data for any finalized transaction.

## Extended by

- [`FinalizedCallTxPublicData`](../../contracts/interfaces/FinalizedCallTxPublicData.md)
- [`FinalizedDeployTxPublicData`](../../contracts/interfaces/FinalizedDeployTxPublicData.md)
- [`FinalizedCallTxPublicData`](../../../midnight-js-contracts/interfaces/FinalizedCallTxPublicData.md)
- [`FinalizedDeployTxPublicData`](../../../midnight-js-contracts/interfaces/FinalizedDeployTxPublicData.md)

## Properties

### blockAuthor

> `readonly` **blockAuthor**: `string` \| `null`

Defined in: packages/types/dist/index.d.ts:223

The author of the block in which the transaction was included.

***

### blockHash

> `readonly` **blockHash**: `string`

Defined in: packages/types/dist/index.d.ts:211

The block hash of the block in which the transaction was included.

***

### blockHeight

> `readonly` **blockHeight**: `number`

Defined in: packages/types/dist/index.d.ts:215

The block height of the block in which the transaction was included.

***

### blockTimestamp

> `readonly` **blockTimestamp**: `number`

Defined in: packages/types/dist/index.d.ts:219

The timestamp of the block in which the transaction was included.

***

### fees

> `readonly` **fees**: [`Fees`](../type-aliases/Fees.md)

Defined in: packages/types/dist/index.d.ts:235

The fees associated with the transaction, including both paid and estimated fees.

***

### identifiers

> `readonly` **identifiers**: readonly `string`[]

Defined in: packages/types/dist/index.d.ts:203

All transaction IDs of the submitted transaction.

***

### indexerId

> `readonly` **indexerId**: `number`

Defined in: packages/types/dist/index.d.ts:227

The indexer internal db ID.

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

Defined in: packages/types/dist/index.d.ts:231

The protocol version of the transaction.

***

### segmentStatusMap

> `readonly` **segmentStatusMap**: `Map`\<`number`, [`SegmentStatus`](../type-aliases/SegmentStatus.md)\> \| `undefined`

Defined in: packages/types/dist/index.d.ts:240

The map that associates segment identifiers (numbers) with their corresponding status [SegmentStatus](../type-aliases/SegmentStatus.md).
The segment identifier is represented as a number (key in the map), and the status indicates the success or failure of the transaction update.

***

### status

> `readonly` **status**: [`TxStatus`](../type-aliases/TxStatus.md)

Defined in: packages/types/dist/index.d.ts:195

The status of a submitted transaction.

***

### tx

> `readonly` **tx**: [`Transaction`](../classes/Transaction.md)\<[`SignatureEnabled`](https://github.com/midnightntwrk/midnight-ledger), [`Proof`](https://github.com/midnightntwrk/midnight-ledger), [`Binding`](https://github.com/midnightntwrk/midnight-ledger)\>

Defined in: packages/types/dist/index.d.ts:191

The transaction that was finalized.

***

### txHash

> `readonly` **txHash**: `string`

Defined in: packages/types/dist/index.d.ts:207

The transaction hash of the transaction in which the original transaction was included.

***

### txId

> `readonly` **txId**: `string`

Defined in: packages/types/dist/index.d.ts:199

One of the transaction ID of the submitted transaction.

***

### unshielded

> `readonly` **unshielded**: [`UnshieldedUtxos`](../type-aliases/UnshieldedUtxos.md)

Defined in: packages/types/dist/index.d.ts:245

Represents the unshielded outputs, typically used for transactions or operations
involving data or values that are not encrypted or concealed.

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / CallResultPublicBase

# Interface: CallResultPublicBase

The public, non-sensitive half of a circuit execution that every era carries.

Both members are plain data: an operation sequence and a pair of transcript
halves. Era-specific post-state — a live runtime handle in either era — is
NOT here, because no such handle may cross an era boundary.

## Extended by

- [`CallResultPublic`](../../contracts/interfaces/CallResultPublic.md)
- [`CallResultPublic`](../../contracts/namespaces/Ledger8/interfaces/CallResultPublic.md)
- [`ContractCallPublic`](../../contracts/namespaces/Ledger8/interfaces/ContractCallPublic.md)
- [`CallResultPublic`](../../../midnight-js-contracts/index/namespaces/Ledger8/interfaces/CallResultPublic.md)
- [`ContractCallPublic`](../../../midnight-js-contracts/index/namespaces/Ledger8/interfaces/ContractCallPublic.md)
- [`CallResultPublic`](../../../midnight-js-contracts/index/interfaces/CallResultPublic.md)

## Properties

### partitionedTranscript

> `readonly` **partitionedTranscript**: [`PartitionedTranscript`](https://github.com/midnightntwrk/midnight-ledger)

The public transcript partitioned into its guaranteed and fallible halves.
The guaranteed half must succeed for the transaction to be valid; the
fallible half may fail without invalidating it.

***

### publicTranscript

> `readonly` **publicTranscript**: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]

The public transcript the execution produced, unpartitioned.

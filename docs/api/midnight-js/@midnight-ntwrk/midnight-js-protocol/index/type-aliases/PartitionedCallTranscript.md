[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / PartitionedCallTranscript

# Type Alias: PartitionedCallTranscript

> **PartitionedCallTranscript** = \[[`Transcript`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\> \| `undefined`, [`Transcript`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\> \| `undefined`\]

A call's guaranteed/fallible transcript pair, as the ledger's partitioner
answers it. Either member is absent when that segment carries nothing.

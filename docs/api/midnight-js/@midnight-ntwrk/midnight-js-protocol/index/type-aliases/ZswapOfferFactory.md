[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ZswapOfferFactory

# Type Alias: ZswapOfferFactory

> **ZswapOfferFactory** = (`partitions`) => `object`

Builds the transaction's Zswap offers once the composer holds every call's
partition, in `calls` order. Returns serialized offer bytes per segment; an
absent member is the normal shape of a segment that moves no shielded coin.

A function rather than ready-made bytes: there is deliberately no way to
supply an offer without being handed the partition it must be routed against.

## Parameters

### partitions

readonly [`PartitionedCallTranscript`](PartitionedCallTranscript.md)[]

## Returns

`object`

### fallible?

> `readonly` `optional` **fallible?**: `Uint8Array`

### guaranteed?

> `readonly` `optional` **guaranteed?**: `Uint8Array`

## See

[ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md) for why the boundary is not known until the
composer has split the transcripts.

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ComposeCallResultPojo

# Interface: ComposeCallResultPojo

What a composed call transaction answers with: the serialized UNPROVEN
transaction, and the partition each call was split into, in `calls` order.

The partitions are returned rather than left inside the composer because a
caller that has to report what a call recorded per segment would otherwise
have to split the same transcript a second time, and nothing would notice if
the two answers stopped agreeing.

## See

[EraBoundary](../../documents/EraBoundary.md)

## Properties

### partitions

> `readonly` **partitions**: readonly [`PartitionedCallTranscript`](../type-aliases/PartitionedCallTranscript.md)[]

***

### txBytes

> `readonly` **txBytes**: `Uint8Array`

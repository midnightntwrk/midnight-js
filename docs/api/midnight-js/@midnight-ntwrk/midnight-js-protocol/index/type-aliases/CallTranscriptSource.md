[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / CallTranscriptSource

# Type Alias: CallTranscriptSource

> **CallTranscriptSource** = \{ `kind`: `"unpartitioned"`; `partitionContext`: [`PartitionContext`](../interfaces/PartitionContext.md); `preState`: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger); `publicTranscript`: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]; \} \| \{ `fallible?`: [`Transcript`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>; `guaranteed?`: [`Transcript`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>; `kind`: `"partitioned"`; \}

Where a call's public transcript comes from. Two shapes, because neither
production leg subsumes the other:

- `'unpartitioned'` — the raw op sequence a circuit emitted on the retained
  pre-fork execution leg, the state it ran against, and the
  [PartitionContext](../interfaces/PartitionContext.md) that leg recorded.
- `'partitioned'` — a guaranteed/fallible pair already split by compact-js,
  which is the current production path.

Every member is plain data in the ledger's own declared algebra — no live
WASM handle.

## See

 - [RetainedEraExecution](../../documents/RetainedEraExecution.md) for the leg that submits the unpartitioned
shape.
 - [ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md) for why an already-partitioned pair is
passed through rather than re-derived.
 - [EraSeam](../../documents/EraSeam.md)

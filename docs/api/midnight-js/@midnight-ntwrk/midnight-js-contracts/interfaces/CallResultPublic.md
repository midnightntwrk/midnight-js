[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallResultPublic

# Interface: CallResultPublic

The public portions of the call result.

## Extended by

- [`FinalizedCallTxPublicData`](FinalizedCallTxPublicData.md)

## Properties

### logEvents

> `readonly` **logEvents**: readonly `LogEvent`[]

The MIP-0002 contract log events emitted during circuit execution. Surfaced on the `compact-js`
executor result and typed by `compact-runtime`'s LogEvent. This is the single
execution-wide list across the whole call tree (not just the root call), in emission order; each
event is tagged with its emitting contract's address, so a per-contract view is a filter over
that address.

Events are carried **raw** — decode on demand with `ContractLog.decodeAll` (re-exported from
this package). The decoder degrades gracefully and never throws, but it is `@experimental`: a
successful decode can still yield a silently-wrong payload, so treat decoded values with care.
Empty when the circuit emits no logs.

***

### nextContractState

> `readonly` **nextContractState**: `StateValue`

The public state resulting from executing the circuit.

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: `PartitionedTranscript`

A [publicTranscript](#publictranscript) partitioned into guaranteed and fallible sections.
The guaranteed section of a public transcript must succeed for the corresponding
transaction to be considered valid. The fallible section of a public transcript
can fail without invalidating the transaction, as long as the guaranteed section succeeds.

***

### publicTranscript

> `readonly` **publicTranscript**: `Op`\<`AlignedValue`\>[]

The public transcript resulting from executing the circuit.

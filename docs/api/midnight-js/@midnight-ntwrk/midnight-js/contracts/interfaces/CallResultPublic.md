[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallResultPublic

# Interface: CallResultPublic

The public portions of the call result.

## Extends

- [`CallResultPublicBase`](../../types/interfaces/CallResultPublicBase.md)

## Extended by

- [`FinalizedCallTxPublicData`](FinalizedCallTxPublicData.md)

## Properties

### logEvents

> `readonly` **logEvents**: readonly [`LogEvent`](https://github.com/LFDT-Minokawa/compact)[]

The MIP-0002 contract log events emitted during circuit execution. Surfaced on the `compact-js`
executor result and typed by `compact-runtime`'s [LogEvent](https://github.com/LFDT-Minokawa/compact). This is the single
execution-wide list across the whole call tree (not just the root call), in emission order; each
event is tagged with its emitting contract's address, so a per-contract view is a filter over
that address.

Events are carried **raw** — decode on demand with `ContractLog.decodeAll` (re-exported from
this package). The decoder degrades gracefully and never throws, but it is `@experimental`: a
successful decode can still yield a silently-wrong payload, so treat decoded values with care.
Empty when the circuit emits no logs.

***

### nextContractState

> `readonly` **nextContractState**: [`StateValue`](https://github.com/midnightntwrk/midnight-ledger)

The public state resulting from executing the circuit.

***

### nextContractStateEncoded

> `readonly` **nextContractStateEncoded**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

The same state as an [EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger): the form that survives this
process, a `structuredClone`, a worker transfer and storage.

The handle above is valid only while the runtime instance that produced it
is loaded -- anything that walks it sees `__wbg_ptr`, an integer that means
nothing outside its module. `EncodedStateValue` is pinned identical across
`onchain-runtime-v3`, `ledger-v8` and `ledger-v9`, so this is the member
era-agnostic code reads and the one to persist, in either era.

Derived from the handle rather than fetched again, so the two cannot
describe different states. It costs one encode per call; read
[CallResultPublic.nextContractState](#nextcontractstate) instead when the value never
leaves the process that produced it.

#### See

ADR-0010 for the decision to publish the handle AND the bytes.

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: [`PartitionedTranscript`](https://github.com/midnightntwrk/midnight-ledger)

The public transcript partitioned into its guaranteed and fallible halves.
The guaranteed half must succeed for the transaction to be valid; the
fallible half may fail without invalidating it.

#### Inherited from

[`CallResultPublicBase`](../../types/interfaces/CallResultPublicBase.md).[`partitionedTranscript`](../../types/interfaces/CallResultPublicBase.md#partitionedtranscript)

***

### publicTranscript

> `readonly` **publicTranscript**: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]

The public transcript the execution produced, unpartitioned.

#### Inherited from

[`CallResultPublicBase`](../../types/interfaces/CallResultPublicBase.md).[`publicTranscript`](../../types/interfaces/CallResultPublicBase.md#publictranscript)

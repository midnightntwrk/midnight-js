[**Midnight.js API Reference v5.0.0-rc.4**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ContractCallPublic

# Interface: ContractCallPublic\<TState\>

The public half of ONE retained-era contract call.

Both state members are LIVE `onchain-runtime-v3` handles, valid only while
the retained runtime instance that produced them is loaded. Neither survives
`structuredClone`, a worker transfer or serialization; both are published
under ADR-0010 for callers that want the object rather than another decode of
the same bytes, and both carry an [EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger) twin for
everything else.

## Extends

- [`CallResultPublicBase`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md)

## Type Parameters

### TState

`TState` = `RetainedStateValue`

The retained-era state type; the framework's own
retained runtime fills it with compact-js's ledger-8 state handle.

## Properties

### contractState

> `readonly` **contractState**: `TState`

The state this call ENDED on.

The current era's member of this name is filled from `compact-js`'s FINAL
query context, so the two eras answer the same question here. For the state
the call started from, read [Ledger8ContractCallPublic.preContractState](#precontractstate)
— a different fact, under a different name.

***

### contractStateEncoded

> `readonly` **contractStateEncoded**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

The same post-call state as an [EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger) — see
[Ledger8CallResultPublic.nextContractStateEncoded](CallResultPublic.md#nextcontractstateencoded) for which of the
two to reach for.

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: [`PartitionedTranscript`](https://github.com/midnightntwrk/midnight-ledger)

The public transcript partitioned into its guaranteed and fallible halves.
The guaranteed half must succeed for the transaction to be valid; the
fallible half may fail without invalidating it.

#### Inherited from

[`CallResultPublicBase`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md).[`partitionedTranscript`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md#partitionedtranscript)

***

### preContractState

> `readonly` **preContractState**: `TState`

The state this call BOUND to: the retained-era handle the pipeline
executed against, forwarded rather than re-derived.

Retained-era only. The current era publishes no pre-call state on a call
entry, so era-agnostic code must not reach for this member.

Indistinguishable from Ledger8ContractCallPublic.postContractState
BY TYPE: compact-js resolves the pre- and post-execution state to the same
declaration, so swapping the two is not a compile error. Partitioning
against the wrong one rejects a state the transcript's reads do not fit, or
silently mis-charges one that merely differs in value.

***

### preContractStateEncoded

> `readonly` **preContractStateEncoded**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

The same pre-call state as an [EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger) — this one IS the
snapshot's own primary state, the value the handle was decoded from, so it
is forwarded rather than re-encoded.

***

### publicTranscript

> `readonly` **publicTranscript**: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]

The public transcript the execution produced, unpartitioned.

#### Inherited from

[`CallResultPublicBase`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md).[`publicTranscript`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md#publictranscript)

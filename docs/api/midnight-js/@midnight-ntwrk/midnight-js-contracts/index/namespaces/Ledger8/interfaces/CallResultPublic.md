[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CallResultPublic

# Interface: CallResultPublic

The public, non-sensitive half of a retained-era circuit execution.

Carries [CallResultPublicBase](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md) plus the post-call state. Against the
current era's `CallResultPublic` exactly ONE member is missing: `logEvents`,
because the retained toolchain has no log-event concept at any layer, so
there is no value to carry rather than a value being dropped. That absence is
named in the era key-set parity gate's allow-list, which is what keeps a
second absence from joining it unnoticed.

## Extends

- [`CallResultPublicBase`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md)

## Properties

### nextContractState

> `readonly` **nextContractState**: `DownConvertedState`

The state the execution ENDED on, as a LIVE `onchain-runtime-v3` handle
rather than as bytes.

Valid only while the retained runtime instance that produced it is loaded.
It does not survive `structuredClone`, a `postMessage` to a worker, or
serialization — anything that walks it sees `__wbg_ptr`, an integer that
means nothing outside its module. Serialize it yourself if you need to
keep it; see ADR-0010.

***

### nextContractStateEncoded

> `readonly` **nextContractStateEncoded**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

The same state as an [EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger): the form that survives this
process, a `structuredClone`, a worker transfer and storage.

`EncodedStateValue` is pinned identical across `onchain-runtime-v3`,
`ledger-v8` and `ledger-v9`, so this is the member era-agnostic code reads
and the one to persist. The handle above is for use in the process that
produced it.

***

### partitionedTranscript

> `readonly` **partitionedTranscript**: [`PartitionedTranscript`](https://github.com/midnightntwrk/midnight-ledger)

The public transcript partitioned into its guaranteed and fallible halves.
The guaranteed half must succeed for the transaction to be valid; the
fallible half may fail without invalidating it.

#### Inherited from

[`CallResultPublicBase`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md).[`partitionedTranscript`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md#partitionedtranscript)

***

### publicTranscript

> `readonly` **publicTranscript**: [`Op`](https://github.com/midnightntwrk/midnight-ledger)\<[`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)\>[]

The public transcript the execution produced, unpartitioned.

#### Inherited from

[`CallResultPublicBase`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md).[`publicTranscript`](../../../../../midnight-js/types/interfaces/CallResultPublicBase.md#publictranscript)

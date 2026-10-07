[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / TranscriptPojo

# Interface: TranscriptPojo

The result of one retained-era circuit call: every artifact
wrapKeepStateCall (`../v9/wrap.ts`) needs to assemble a v9-native
`ContractCallPrototype`.

`preContractState` and `postContractState` are LIVE HANDLES from the retained
runtime; every other member is plain data. `postContractStateEncoded` is the
post-state's encoded form, carried beside the handle so a caller has a value
that outlives the runtime instance.

## See

[RetainedEraExecution](../../documents/RetainedEraExecution.md)

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### input

> `readonly` **input**: `AlignedValue`

***

### output

> `readonly` **output**: `AlignedValue`

***

### partitionContext

> `readonly` **partitionContext**: [`PartitionContext`](PartitionContext.md)

***

### postContractState

> `readonly` **postContractState**: `StateValue`

The state the call LEFT, i.e. compact-js's own `contractState`.

See [TranscriptPojo.preContractState](#precontractstate): the two are the same type.

***

### postContractStateEncoded

> `readonly` **postContractStateEncoded**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

The post-call state as an [EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger): the same value
[postContractState](#postcontractstate) holds, in the form that survives this process.

`EncodedStateValue` is pinned identical across the retained and current
runtimes, so this is the member era-agnostic code reads, and the one that
can be persisted, cloned or sent to a worker.

***

### preContractState

> `readonly` **preContractState**: `StateValue`

The state the call BOUND to, i.e. `partitionInputs.state`.

Indistinguishable from [TranscriptPojo.postContractState](#postcontractstate) BY TYPE:
compact-js resolves both to the same declaration, so swapping the two is
not a compile error. Partitioning against the wrong one rejects a state the
transcript's reads do not fit, or silently mis-charges one that merely
differs in value, so the distinction rests on the member name alone.

***

### privateStateAfter

> `readonly` **privateStateAfter**: `unknown`

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: `AlignedValue`[]

***

### publicTranscript

> `readonly` **publicTranscript**: `Op`\<`AlignedValue`\>[]

***

### result

> `readonly` **result**: `unknown`

***

### zswapLocalState

> `readonly` **zswapLocalState**: `ZswapLocalState`

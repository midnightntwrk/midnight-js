[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / TranscriptPojo

# Interface: TranscriptPojo

The result of one impure circuit's invocation on a pre-fork
(`compact-runtime@0.16`) contract instance: the primary result plus every
artifact wrapKeepStateCall (`../v9/wrap.ts`) needs to assemble a
v9-native `ContractCallPrototype`.

`preContractState`/`postContractState` are [DownConvertedState](DownConvertedState.md)s, not
full pre-fork `ContractState`s: they carry only `.data`. They are also the
only members here that are LIVE HANDLES -- every other member of this type is
plain data. `postContractStateEncoded` is the post-state's encoded form,
carried beside the handle so a caller has a value that outlives the runtime
instance; the pre-state's encoded form is the caller's own input, which
`downConvertForExecution` already proves round-trips to it.

`partitionContext` is the query-context state the call ran with, which the
carried state bytes do not hold — see [PartitionContext](PartitionContext.md). A composition
leg needs it to partition the call's transcript.

`zswapLocalState` is the post-call Zswap local state, DECODED into the
runtime's public shape: the coins the circuit spent and produced. A caller
turns it into the transaction's segmented Zswap offer
(`zswapStateToSegmentedOffer`, `packages/contracts/src/internal/utils/zswap-utils.ts`)
and hands that offer to whichever composition leg it targets.

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

> `readonly` **postContractState**: [`DownConvertedState`](DownConvertedState.md)

***

### postContractStateEncoded

> `readonly` **postContractStateEncoded**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

The post-call state as an [EncodedStateValue](https://github.com/midnightntwrk/midnight-ledger): the same value
[postContractState](#postcontractstate) holds, in the form that survives this process.

`EncodedStateValue` is pinned identical across `onchain-runtime-v3`,
`ledger-v8` and `ledger-v9` -- see this package's README and the
cross-runtime assertions in `src/test/v8-down-convert.test.ts` -- so this is
the member era-agnostic code reads, and the one that can be persisted,
cloned or sent to a worker.

***

### preContractState

> `readonly` **preContractState**: [`DownConvertedState`](DownConvertedState.md)

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

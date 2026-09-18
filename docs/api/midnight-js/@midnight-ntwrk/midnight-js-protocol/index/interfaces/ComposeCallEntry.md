[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ComposeCallEntry

# Interface: ComposeCallEntry

One contract call in a call transaction.

`contractState` is the raw, serialized state the call is dispatched against,
as read from chain. It supplies the registered operation for `circuitId`,
including its verifier key, which the call's key location hashes; a
constructor-built state will not do, because it declares its entry points
with blank keys.

`communicationCommitmentRandomness` is the randomness the runtime bound a
cross-contract callee to its caller with. The root call — being no one's
callee — omits it and gets fresh randomness.

## See

[EraSeam](../../documents/EraSeam.md)

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### communicationCommitmentRandomness?

> `readonly` `optional` **communicationCommitmentRandomness?**: `string`

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### contractState

> `readonly` **contractState**: `Uint8Array`

***

### input

> `readonly` **input**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParametersOption`](../type-aliases/LedgerParametersOption.md)

The ledger parameters the chain held at the block this call is built against, serialized —
`RawContractState.ledgerParameters`, passed through untouched — or
[INITIAL\_LEDGER\_PARAMETERS](../variables/INITIAL_LEDGER_PARAMETERS.md) to partition against the ledger's initial cost model instead.

Required, and deliberately so. See [LedgerParametersOption](../type-aliases/LedgerParametersOption.md).

***

### output

> `readonly` **output**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)[]

***

### transcript

> `readonly` **transcript**: [`CallTranscriptSource`](../type-aliases/CallTranscriptSource.md)

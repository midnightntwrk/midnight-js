[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / CallResultPrivateBase

# Interface: CallResultPrivateBase\<Result, PrivateState\>

The private, ZK-confidential half of a circuit execution that every era
carries.

Generic over the two members whose types are genuinely era-specific: the
circuit's own return value and the contract's private state. Everything else
is one shared declaration, including `nextZswapLocalState` — the two
runtimes' `ZswapLocalState` interfaces are mutually assignable, asserted in
both directions by `packages/protocol/src/test/v8-execute.test.ts`, so one
type serves both eras rather than a third type parameter that would only ever
be filled with structurally equal arguments.

## Remarks

**Privacy-sensitive.** Every member carries data the zero-knowledge
proofs were designed to keep confidential. Do not log, serialize or transmit
a value of a type derived from this one.

## Extends

- [`ContractCallPrivateBase`](ContractCallPrivateBase.md)

## Type Parameters

### Result

`Result`

What the circuit itself returned.

### PrivateState

`PrivateState`

The private state the execution produced.

## Properties

### input

> `readonly` **input**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit arguments.

#### Inherited from

[`ContractCallPrivateBase`](ContractCallPrivateBase.md).[`input`](ContractCallPrivateBase.md#input)

***

### nextPrivateState

> `readonly` **nextPrivateState**: `PrivateState`

The private state resulting from executing the circuit.

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state resulting from executing the circuit.

***

### output

> `readonly` **output**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit result.

#### Inherited from

[`ContractCallPrivateBase`](ContractCallPrivateBase.md).[`output`](ContractCallPrivateBase.md#output)

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)[]

ZK representation of the circuit's witness call results.

#### Inherited from

[`ContractCallPrivateBase`](ContractCallPrivateBase.md).[`privateTranscriptOutputs`](ContractCallPrivateBase.md#privatetranscriptoutputs)

***

### result

> `readonly` **result**: `Result`

The JS representation of the value the circuit returned.

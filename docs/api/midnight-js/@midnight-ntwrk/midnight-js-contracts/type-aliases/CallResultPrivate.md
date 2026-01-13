[**Midnight.js API Reference v3.0.0-alpha.14**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallResultPrivate

# Type Alias: CallResultPrivate\<C, ICK\>

> **CallResultPrivate**\<`C`, `ICK`\> = `object`

The private (sensitive) portions of the call result.

## Type Parameters

### C

`C` *extends* `Contract`

### ICK

`ICK` *extends* `ImpureCircuitId`\<`C`\>

## Properties

### input

> `readonly` **input**: `AlignedValue`

ZK representation of the circuit arguments.

***

### nextPrivateState

> `readonly` **nextPrivateState**: `PrivateState`\<`C`\>

The private state resulting from executing the circuit.

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: `ZswapLocalState`

The Zswap local state resulting from executing the circuit.

***

### output

> `readonly` **output**: `AlignedValue`

ZK representation of the circuit result.

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: `AlignedValue`[]

ZK representation of the circuit witness call results.

***

### result

> `readonly` **result**: `CircuitReturnType`\<`C`, `ICK`\>

The JS representation of the input to the circuit.

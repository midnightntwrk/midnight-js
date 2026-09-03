[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CallProofData

# Interface: CallProofData

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:16

Encapsulates the data required to produce a zero-knowledge proof

## Extends

- [`ProofData`](ProofData.md)

## Properties

### circuitId

> **circuitId**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:20

The ID of the circuit that was called.

***

### commCommData?

> `optional` **commCommData?**: [`CommunicationCommitmentData`](CommunicationCommitmentData.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:43

Data included by the parent call only if this was a sub-call

***

### contractAddress

> **contractAddress**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:24

The address of the contract defining the circuit for which this proof data is pertinent.

***

### finalQueryContext

> **finalQueryContext**: [`QueryContext`](../../onchain-runtime/classes/QueryContext.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:32

The ledger state of the contract when the circuit finished.

***

### initialQueryContext

> **initialQueryContext**: [`QueryContext`](../../onchain-runtime/classes/QueryContext.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:28

The ledger state of the contract before the circuit was called.

***

### input

> **input**: [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:9

The inputs to a circuit

#### Inherited from

[`ProofData`](ProofData.md).[`input`](ProofData.md#input)

***

### output

> **output**: [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:26

The outputs from a circuit

#### Inherited from

[`ProofData`](ProofData.md).[`output`](ProofData.md#output)

***

### privateTranscriptOutputs

> **privateTranscriptOutputs**: [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:17

The transcript of the witness call outputs

#### Inherited from

[`ProofData`](ProofData.md).[`privateTranscriptOutputs`](ProofData.md#privatetranscriptoutputs)

***

### publicTranscript

> **publicTranscript**: [`Op`](../../onchain-runtime/type-aliases/Op.md)\<[`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)\>[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:13

The public transcript of operations

#### Inherited from

[`ProofData`](ProofData.md).[`publicTranscript`](ProofData.md#publictranscript)

***

### zswapLocalState

> **zswapLocalState**: [`EncodedZswapLocalState`](EncodedZswapLocalState.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:39

The Zswap local state this contract accumulated during the call — the shielded coins it
consumed and produced. Recorded per call, not just for the root, so transaction assembly can
build one offer contribution per call and bind each contract-owned input and output to the
contract that actually made it.

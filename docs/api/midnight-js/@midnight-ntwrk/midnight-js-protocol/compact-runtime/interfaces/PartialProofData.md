[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / PartialProofData

# Interface: PartialProofData

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:5

Encapsulates the data required to produce a zero-knowledge proof except the circuit output

## Extended by

- [`ProofData`](ProofData.md)

## Properties

### input

> **input**: [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:9

The inputs to a circuit

***

### privateTranscriptOutputs

> **privateTranscriptOutputs**: [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:17

The transcript of the witness call outputs

***

### publicTranscript

> **publicTranscript**: [`Op`](../../onchain-runtime/type-aliases/Op.md)\<[`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)\>[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:13

The public transcript of operations

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / ProofData

# Interface: ProofData

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:22

Encapsulates the data required to produce a zero-knowledge proof

## Extends

- [`PartialProofData`](PartialProofData.md)

## Extended by

- [`CallProofData`](CallProofData.md)

## Properties

### input

> **input**: [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:9

The inputs to a circuit

#### Inherited from

[`PartialProofData`](PartialProofData.md).[`input`](PartialProofData.md#input)

***

### output

> **output**: [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:26

The outputs from a circuit

***

### privateTranscriptOutputs

> **privateTranscriptOutputs**: [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:17

The transcript of the witness call outputs

#### Inherited from

[`PartialProofData`](PartialProofData.md).[`privateTranscriptOutputs`](PartialProofData.md#privatetranscriptoutputs)

***

### publicTranscript

> **publicTranscript**: [`Op`](../../onchain-runtime/type-aliases/Op.md)\<[`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md)\>[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/proof-data.d.ts:13

The public transcript of operations

#### Inherited from

[`PartialProofData`](PartialProofData.md).[`publicTranscript`](PartialProofData.md#publictranscript)

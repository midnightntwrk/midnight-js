[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ContractCallPrivateBase

# Interface: ContractCallPrivateBase

The ZK-confidential half of ONE contract call, in every era.

The same three members describe the whole execution's private half and each
individual call in its tree, which is why they are declared once here rather
than twice.

## Remarks

**Privacy-sensitive.** Every member is data the zero-knowledge
proofs were designed to keep confidential.

## Extended by

- [`CallResultPrivateBase`](CallResultPrivateBase.md)

## Properties

### input

> `readonly` **input**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit arguments.

***

### output

> `readonly` **output**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)

ZK representation of the circuit result.

***

### privateTranscriptOutputs

> `readonly` **privateTranscriptOutputs**: [`AlignedValue`](https://github.com/midnightntwrk/midnight-ledger)[]

ZK representation of the circuit's witness call results.

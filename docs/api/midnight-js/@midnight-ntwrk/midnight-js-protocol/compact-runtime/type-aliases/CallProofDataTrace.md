[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CallProofDataTrace

# Type Alias: CallProofDataTrace

> **CallProofDataTrace** = [`CallProofData`](../interfaces/CallProofData.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:89

List of data needed to construct proofs and transactions for all circuit calls
resulting from executing a root circuit. The calls are in depth-first traversal order.
In other words, the first circuit to complete execution is first, and the last circuit
to complete execution (the root circuit) is last.

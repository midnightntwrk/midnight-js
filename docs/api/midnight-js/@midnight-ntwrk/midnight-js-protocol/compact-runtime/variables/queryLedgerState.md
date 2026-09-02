[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / queryLedgerState

# Variable: queryLedgerState

> `const` **queryLedgerState**: (`circuitContext`, `partialProofData`, `program`) => [`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md) \| `undefined`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:242

Runs a program (query) against the current ledger state in the given circuit context. Records the transcript in the
given partial proof data.

## Parameters

### circuitContext

[`CircuitContext`](../interfaces/CircuitContext.md)

The context for the currently executing circuit.

### partialProofData

[`PartialProofData`](../interfaces/PartialProofData.md)

The partial proof data to insert the query results into.

### program

[`Op`](../../onchain-runtime/type-aliases/Op.md)\<`null`\>[]

The query to run.

## Returns

[`AlignedValue`](../../onchain-runtime/type-aliases/AlignedValue.md) \| `undefined`

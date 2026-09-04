[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createProofProvider

# Variable: createProofProvider

> `const` **createProofProvider**: (`provingProvider`, `costModel?`) => [`ProofProvider`](../interfaces/ProofProvider.md)

Defined in: packages/types/dist/index.d.ts:858

Creates a [ProofProvider](../interfaces/ProofProvider.md) from a [ProvingProvider](https://github.com/midnightntwrk/midnight-ledger).
The returned provider proves transactions using the initial cost model.

## Parameters

### provingProvider

[`ProvingProvider`](https://github.com/midnightntwrk/midnight-ledger)

The underlying proving provider used to generate proofs.

### costModel?

[`CostModel`](https://github.com/midnightntwrk/midnight-ledger)

Optional cost model to use for proof generation. Defaults to the initial cost model if not provided.

## Returns

[`ProofProvider`](../interfaces/ProofProvider.md)

A [ProofProvider](../interfaces/ProofProvider.md) that delegates proof generation to the given proving provider.

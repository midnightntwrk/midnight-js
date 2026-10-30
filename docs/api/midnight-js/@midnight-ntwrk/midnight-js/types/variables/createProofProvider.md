[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createProofProvider

# Variable: createProofProvider

> `const` **createProofProvider**: (`provingProvider`, `costModel?`) => [`ProofProvider`](../interfaces/ProofProvider.md)

Creates a [ProofProvider](../interfaces/ProofProvider.md) from a v9 ProvingProvider.
The returned provider proves transactions using the initial cost model.

The returned provider serves v9 only — `supportedEras` says so — and refuses
a v8 handle with `ProviderEraUnsupportedError`. It also rejects any
`proveTxConfig.timeout`, including `0`, with `InvalidArgumentError` before
proving starts: a `ProvingProvider` takes no per-request configuration. To
bound proving time, use `httpClientProofProvider`. To serve v8 as well, pass
a v8 proving provider to [createProofProviderFromProvingProviders](createProofProviderFromProvingProviders.md), or,
where the proving itself is not a `ProvingProvider` call, write the handlers
directly with [createProofProviderFromHandlers](createProofProviderFromHandlers.md).

## Parameters

### provingProvider

[`ProvingProvider$1`](https://github.com/midnightntwrk/midnight-ledger)

The underlying proving provider used to generate proofs.

### costModel?

[`CostModel`](https://github.com/midnightntwrk/midnight-ledger)

Optional cost model to use for proof generation. Defaults to the initial cost model if not provided.

## Returns

[`ProofProvider`](../interfaces/ProofProvider.md)

A [ProofProvider](../interfaces/ProofProvider.md) that delegates proof generation to the given proving provider.

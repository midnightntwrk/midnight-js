[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createProofProviderFromHandlers

# Variable: createProofProviderFromHandlers

> `const` **createProofProviderFromHandlers**: (`handlers`) => [`ProofProvider`](../interfaces/ProofProvider.md)

Assembles a [ProofProvider](../interfaces/ProofProvider.md) from one arm per ledger era it serves.

The `supportedEras` declaration is computed from the handlers supplied, so it
cannot disagree with what the provider actually does.

## Parameters

### handlers

[`ProofProviderHandlers`](../interfaces/ProofProviderHandlers.md)

The current-era handler, and one for each retained era served.

## Returns

[`ProofProvider`](../interfaces/ProofProvider.md)

A [ProofProvider](../interfaces/ProofProvider.md) routing each request to its era's arm and
         answering in the era the request arrived in.

## Example

```typescript
const proofProvider = createProofProviderFromHandlers({
  currentEra: (tx) => tx.prove(provingProvider, CostModel.initialCostModel()),
  retainedEras: { v8: (txBytes) => proveV8Transaction(txBytes, provingProvider) }
});
// proofProvider.supportedEras === ['v9', 'v8']
```

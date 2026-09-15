[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / createProofProviderFromArms

# Function: createProofProviderFromArms()

> **createProofProviderFromArms**(`arms`): [`ProofProvider`](../interfaces/ProofProvider.md)

Assembles a [ProofProvider](../interfaces/ProofProvider.md) from one arm per ledger era it serves.

The `supportedEras` declaration is computed from the arms supplied, so it
cannot disagree with what the provider actually does.

## Parameters

### arms

[`ProofProviderArms`](../interfaces/ProofProviderArms.md)

The current-era arm, and a handler for each retained era served.

## Returns

[`ProofProvider`](../interfaces/ProofProvider.md)

A [ProofProvider](../interfaces/ProofProvider.md) routing each request to its era's arm and
         answering in the era the request arrived in.

## Example

```typescript
const proofProvider = createProofProviderFromArms({
  currentEra: (tx) => tx.prove(provingProvider, CostModel.initialCostModel()),
  retainedEras: { v8: (txBytes) => proveV8Transaction(txBytes, provingProvider) }
});
// proofProvider.supportedEras === ['v9', 'v8']
```

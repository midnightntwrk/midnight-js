[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / createProofProviderFromHandlers

# Function: createProofProviderFromHandlers()

> **createProofProviderFromHandlers**(`handlers`): [`ProofProvider`](../interfaces/ProofProvider.md)

Assembles a [ProofProvider](../interfaces/ProofProvider.md) from one handler per ledger era it serves.

The `supportedEras` declaration is computed from the handlers supplied, so it
cannot disagree with what the provider actually does.

`currentEra` is called with `handlers` as `this`; a retained-era handler is
called with no `this`.

## Parameters

### handlers

[`ProofProviderHandlers`](../interfaces/ProofProviderHandlers.md)

The current-era handler, and one for each retained era served.

## Returns

[`ProofProvider`](../interfaces/ProofProvider.md)

A [ProofProvider](../interfaces/ProofProvider.md) routing each request to its era's handler and
         answering in the era the request arrived in.

## Throws

UnusableEraEntryError if `currentEra`, or a `retainedEras` entry other
        than `undefined`, is not a function. Raised at construction.

## Throws

InvalidArgumentError if `handlers` is not an object, or `retainedEras`
        is not a plain object keyed only by retained eras. Raised at construction.

## Example

```typescript
const proofProvider = createProofProviderFromHandlers({
  currentEra: (tx) => tx.prove(provingProvider, CostModel.initialCostModel()),
  retainedEras: { v8: (txBytes) => proveLedger8Transaction(txBytes, provingProvider) }
});
// proofProvider.supportedEras === ['v9', 'v8']
```

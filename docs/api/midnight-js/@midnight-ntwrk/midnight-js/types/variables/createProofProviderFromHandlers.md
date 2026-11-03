[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createProofProviderFromHandlers

# Variable: createProofProviderFromHandlers

> `const` **createProofProviderFromHandlers**: (`handlers`) => [`ProofProvider`](../interfaces/ProofProvider.md)

Assembles a [ProofProvider](../interfaces/ProofProvider.md) from one handler per ledger era.

`supportedEras` is computed from the handlers given, so it cannot disagree
with what the provider does. Each handle is routed to the handler of its own
era, and the answer is sealed in that same era, so a handler never sees a
handle and cannot answer in the wrong era.

Every handler is called with `handlers` as `this`.

## Parameters

### handlers

[`ProofProviderHandlers`](../type-aliases/ProofProviderHandlers.md)

One entry per ledger era.

## Returns

[`ProofProvider`](../interfaces/ProofProvider.md)

A [ProofProvider](../interfaces/ProofProvider.md) routing each handle to its era's handler.

## Throws

UnusableEraEntryError if an era entry is neither `undefined` nor a
        function. Raised at construction.

## Throws

InvalidArgumentError if `handlers` is not an object, has no key for
        a ledger era, or serves no era (every entry `undefined`). Raised at
        construction.

## Example

```typescript
const proofProvider = createProofProviderFromHandlers({
  v8: (tx) => proveLedger8Transaction(tx, ledger8ProvingProvider),
  v9: (tx) => tx.prove(provingProvider, CostModel.initialCostModel())
});
// proofProvider.supportedEras is ['v8', 'v9']
```

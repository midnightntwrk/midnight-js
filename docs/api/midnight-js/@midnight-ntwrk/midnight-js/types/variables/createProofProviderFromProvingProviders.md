[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createProofProviderFromProvingProviders

# Variable: createProofProviderFromProvingProviders

> `const` **createProofProviderFromProvingProviders**: (`provingProviders`) => [`ProofProvider`](../interfaces/ProofProvider.md)

Assembles a [ProofProvider](../interfaces/ProofProvider.md) from one ProvingProvider per ledger
era, deriving the routing and the `supportedEras` declaration from the
proving providers given.

This is the route for an in-process prover that crosses the fork, which needs
one instance per era; the package document explains why.

## Parameters

### provingProviders

[`ProvingProvidersByEra`](../interfaces/ProvingProvidersByEra.md)

One entry per ledger era, and an optional v9 cost model.

## Returns

[`ProofProvider`](../interfaces/ProofProvider.md)

A [ProofProvider](../interfaces/ProofProvider.md) routing each handle to its era's proving provider.

## Throws

UnusableEraEntryError if an era entry is neither `undefined` nor an
        object with callable `check` and `prove`. Raised at construction.

## Throws

InvalidArgumentError if `provingProviders` is not an object, has no key
        for a ledger era, serves no era (every entry `undefined`), or `costModel`
        is given but is not an object. Raised at construction.

## Throws

InvalidArgumentError raised by `proveTx`, before any proving starts,
        if `proveTxConfig.timeout` is set (including `0`): a `ProvingProvider`
        takes no per-request configuration. To bound proving time, use
        `httpClientProofProvider`, which honours it.

## Throws

Ledger8RuntimeMissingError raised by `proveTx` if a v8 handle arrives
        and the v8 runtime cannot be loaded. Defined in
        `@midnight-ntwrk/midnight-js-protocol/errors`.

## Example

```typescript
const proofProvider = createProofProviderFromProvingProviders({
  v8: prover.asV8ProvingProvider(),
  v9: prover.asProvingProvider()
});
// supportedEras is ['v8', 'v9']
```

## See

[Provider era declarations](https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/provider-era-declarations.md)

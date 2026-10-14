[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / createProofProviderForEras

# Variable: createProofProviderForEras

> `const` **createProofProviderForEras**: (`provingProviders`) => [`ProofProvider`](../interfaces/ProofProvider.md)

Assembles a [ProofProvider](../interfaces/ProofProvider.md) from one [ProvingProvider](https://github.com/midnightntwrk/midnight-ledger) per ledger
era it serves, deriving the routing, the version tagging and the
`supportedEras` declaration from the providers supplied.

This is the route for an in-process prover that crosses the fork, which needs
one instance per era; the package document explains why.

## Parameters

### provingProviders

[`ProvingProvidersByEra`](../interfaces/ProvingProvidersByEra.md)

One proving provider per era served, and an optional
                        current-era cost model.

## Returns

[`ProofProvider`](../interfaces/ProofProvider.md)

A [ProofProvider](../interfaces/ProofProvider.md) routing each request to its era's proving
         provider and answering in the era the request arrived in.

## Throws

UnusableEraEntryError if `currentEra`, or a `retainedEras` entry other
        than `undefined`, is not an object with callable `check` and `prove`.
        Raised at construction.

## Throws

InvalidArgumentError if `provingProviders` is not an object,
        `retainedEras` is not a plain object keyed only by retained eras, or
        `costModel` is given but is not an object. Raised at construction.

## Throws

InvalidArgumentError raised by `proveTx`, before any proving starts,
        if `proveTxConfig.timeout` is set (including `0`): a `ProvingProvider`
        takes no per-request configuration. To bound proving time, use
        `httpClientProofProvider`, which honours it.

## Throws

V8PayloadUnsupportedError raised by `proveTx` if a payload arrives on
        a retained era no provider was registered for.

## Throws

UntaggedPayloadError raised by `proveTx` if `version` is missing or
        unrecognised.

## Throws

PayloadNotATransactionError raised by `proveTx` if a retained payload's
        `txBytes` is not a serialized transaction.

## Throws

Ledger8RuntimeMissingError raised by `proveTx` if a retained era is
        reached and that era's runtime cannot be loaded.

`InvalidArgumentError`, `PayloadNotATransactionError` and
`Ledger8RuntimeMissingError` are defined in
`@midnight-ntwrk/midnight-js-protocol/errors`.

## Example

```typescript
const proofProvider = createProofProviderForEras({
  currentEra: currentEraProver.asProvingProvider(),
  retainedEras: { v8: retainedEraProver.asV8ProvingProvider() }
});
// supportedEras is ['v9', 'v8']
```

## See

[Seam era declarations](https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/seam-era-declarations.md)

[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / createProofProviderForEras

# Function: createProofProviderForEras()

> **createProofProviderForEras**(`provingProviders`): [`ProofProvider`](../interfaces/ProofProvider.md)

Assembles a [ProofProvider](../interfaces/ProofProvider.md) from one [ProvingProvider](https://github.com/midnightntwrk/midnight-ledger) per ledger
era it serves, deriving the routing, the version tagging and the
`supportedEras` declaration from the providers supplied.

This is the route for an in-process prover that crosses the fork, which needs
one instance per era; the package document explains why.

[ProveTxConfig](../interfaces/ProveTxConfig.md) is not forwarded on either arm: a `ProvingProvider`
takes no per-request configuration, so a `timeout` passed to `proveTx` does
not reach the proving call. A provider that honours it is
`httpClientProofProvider`.

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

V8PayloadUnsupportedError if a payload arrives on a retained arm no
        provider was registered for.

## Throws

UntaggedPayloadError if `version` is missing or unrecognised.

## Throws

PayloadNotATransactionError if a retained arm's `txBytes` is not a
        serialized transaction.

## Throws

Ledger8RuntimeMissingError if a retained arm is reached and that
        era's runtime cannot be loaded. Both are defined in
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

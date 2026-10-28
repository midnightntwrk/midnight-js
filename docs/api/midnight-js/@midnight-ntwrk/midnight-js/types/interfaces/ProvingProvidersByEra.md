[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ProvingProvidersByEra

# Interface: ProvingProvidersByEra

One ProvingProvider per ledger era, for
[createProofProviderFromProvingProviders](../variables/createProofProviderFromProvingProviders.md): a proving provider for an
era the provider serves and `undefined` for one it does not.

Register the proving provider built for the era its key names. Nothing
verifies that — the v9 shape is a structural superset of the v8 one, so a v9
proving provider under `v8` type-checks.

## See

[Provider era declarations](https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/provider-era-declarations.md)

## Properties

### costModel?

> `readonly` `optional` **costModel?**: [`CostModel`](https://github.com/midnightntwrk/midnight-ledger)

Cost model for v9, defaulting to the initial cost model. v8 always proves
with its own initial cost model, which this cannot override.

***

### v8

> `readonly` **v8**: `ProvingProvider` \| `undefined`

***

### v9

> `readonly` **v9**: [`ProvingProvider`](https://github.com/midnightntwrk/midnight-ledger) \| `undefined`

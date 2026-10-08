[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ProvingProvidersByEra

# Interface: ProvingProvidersByEra

One [ProvingProvider](https://github.com/midnightntwrk/midnight-ledger) per ledger era, for
[createProofProviderForEras](../variables/createProofProviderForEras.md).

## Properties

### costModel?

> `readonly` `optional` **costModel?**: [`CostModel`](https://github.com/midnightntwrk/midnight-ledger)

Cost model for the CURRENT era, defaulting to the initial cost model. A
retained era always proves with its own era's initial cost model, which
this cannot override.

#### See

[Seam era declarations](https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/seam-era-declarations.md)

***

### currentEra

> `readonly` **currentEra**: [`ProvingProvider`](https://github.com/midnightntwrk/midnight-ledger)

***

### retainedEras?

> `readonly` `optional` **retainedEras?**: `Partial`\<`Readonly`\<`Record`\<`"v8"`, `ProvingProvider`\>\>\>

One entry per retained era served, in that era's own `ProvingProvider`
shape. An entry present but `undefined` leaves the era unserved, exactly as
omitting it does: `supportedEras` excludes it, and a payload arriving on
that arm is refused with `V8PayloadUnsupportedError`.

Register the provider built for the era the entry names. Nothing verifies
that — the current era's shape is a structural superset of the retained
era's, so the wrong one type-checks.

#### See

[Seam era declarations](https://github.com/midnightntwrk/midnight-js/blob/main/packages/types/docs/seam-era-declarations.md)

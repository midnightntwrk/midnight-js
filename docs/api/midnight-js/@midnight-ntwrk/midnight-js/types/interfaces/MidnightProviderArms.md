[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / MidnightProviderArms

# Interface: MidnightProviderArms

The per-era arms [createMidnightProviderFromArms](../variables/createMidnightProviderFromArms.md) assembles a
[MidnightProvider](MidnightProvider.md) from.

## Properties

### currentEra

> `readonly` **currentEra**: [`CurrentEraSubmitter`](../type-aliases/CurrentEraSubmitter.md)

Required: every submitter serves the current era.

***

### retainedEras?

> `readonly` `optional` **retainedEras?**: `Partial`\<`Readonly`\<`Record`\<`"v8"`, [`RetainedEraSubmitter`](../type-aliases/RetainedEraSubmitter.md)\>\>\>

Optional, one entry per retained era this submitter serves.

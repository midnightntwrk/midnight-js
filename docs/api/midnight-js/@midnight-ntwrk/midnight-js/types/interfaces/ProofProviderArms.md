[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ProofProviderArms

# Interface: ProofProviderArms

The per-era arms [createProofProviderFromArms](../variables/createProofProviderFromArms.md) assembles a
[ProofProvider](ProofProvider.md) from.

Writing the arms rather than the whole interface means an implementation
never writes a `version` tag, never narrows a payload, and cannot answer in
the wrong era — the factory routes each request to its own era's arm and tags
the answer to match. What is left in each arm is the proving itself.

## Properties

### currentEra

> `readonly` **currentEra**: [`CurrentEraProver`](../type-aliases/CurrentEraProver.md)

Required: every provider serves the current era.

***

### retainedEras?

> `readonly` `optional` **retainedEras?**: `Partial`\<`Readonly`\<`Record`\<`"v8"`, [`RetainedEraProver`](../type-aliases/RetainedEraProver.md)\>\>\>

Optional, one entry per retained era this provider serves.

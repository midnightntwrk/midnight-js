[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / CurrentPipelineEra

# Type Alias: CurrentPipelineEra

> **CurrentPipelineEra** = `Extract`\<[`PipelineEra`](PipelineEra.md), `"ledger9"`\>

The tag a CURRENT-era result carries.

Declared as the single member rather than as [PipelineEra](PipelineEra.md) so that
`result.era` DISCRIMINATES: a union of the two eras' results narrows to one
arm on `if (result.era === 'ledger9')`, which it could not do if both arms
declared the whole union.

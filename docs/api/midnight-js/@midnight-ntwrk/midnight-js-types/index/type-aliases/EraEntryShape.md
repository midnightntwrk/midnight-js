[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / EraEntryShape

# Type Alias: EraEntryShape

> **EraEntryShape** = `"handler"` \| `"proving-provider"`

The shape a provider factory needs for each era entry — the value passed as
`currentEra` or under `retainedEras`: a `handler` function
for the `…FromHandlers` factories, a `proving-provider` with callable
`check` and `prove` for `createProofProviderForEras`.

[**Midnight.js API Reference v5.0.1-rc.1**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / EraEntryShape

# Type Alias: EraEntryShape

> **EraEntryShape** = `"handler"` \| `"proving-provider"`

The shape a provider factory needs for each era entry — the value passed
under an era key such as `v8`: a `handler` function
for the `…FromHandlers` factories, a `proving-provider` with callable
`check` and `prove` for `createProofProviderFromProvingProviders`.

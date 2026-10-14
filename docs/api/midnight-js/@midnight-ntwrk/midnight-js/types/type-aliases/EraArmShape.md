[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / EraArmShape

# Type Alias: EraArmShape

> **EraArmShape** = `"handler"` \| `"proving-provider"`

The shape a provider factory needs for each era arm: a `handler` function
for the `…FromHandlers` factories, a `proving-provider` with callable
`check` and `prove` for `createProofProviderForEras`.

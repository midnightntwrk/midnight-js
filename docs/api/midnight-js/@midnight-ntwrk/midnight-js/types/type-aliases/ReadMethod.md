[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ReadMethod

# Type Alias: ReadMethod

> **ReadMethod** = `"watchForTxData"` \| `"watchForDeployTxData"`

The [PublicDataProvider](../interfaces/PublicDataProvider.md) methods that report an era-tagged
finalized-transaction record.

Declared here, alongside the interface that owns those methods, rather than
in a consuming package — otherwise every consumer outside that package falls
back to `string` and the closure is lost exactly where it is needed.

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ProviderMethod

# Type Alias: ProviderMethod

> **ProviderMethod** = [`TransactionMethod`](TransactionMethod.md) \| [`ReadMethod`](ReadMethod.md) \| [`StateReadMethod`](StateReadMethod.md)

Every provider method at which a payload's ledger era is resolved or
narrowed — the three transaction methods, the two record reads and the
version-tagged state read.

This is the vocabulary to type a caught error's `method` against when the
error can come from either surface.

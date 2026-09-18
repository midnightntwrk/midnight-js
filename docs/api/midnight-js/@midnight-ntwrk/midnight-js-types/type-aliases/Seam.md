[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / Seam

# Type Alias: Seam

> **Seam** = [`ProviderSeam`](ProviderSeam.md) \| [`ReadSeam`](ReadSeam.md)

Every seam at which a payload's ledger era is resolved or narrowed — the
three transaction seams plus the two read-surface methods.

This is the vocabulary to type a caught error's `seam` against when the
error can come from either surface.

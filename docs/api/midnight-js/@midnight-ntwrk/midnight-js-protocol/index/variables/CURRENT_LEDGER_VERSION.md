[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / CURRENT\_LEDGER\_VERSION

# Variable: CURRENT\_LEDGER\_VERSION

> `const` **CURRENT\_LEDGER\_VERSION**: `"v9"`

The era whose objects this build hands out live, through `./ledger`.

A protocol fact rather than a consumer's choice: it is decided by which
ledger the package links eagerly, and every other era is reached lazily and
crosses package boundaries as bytes. Declared here so that no package
downstream restates "which era is now" as a literal of its own.

The type is the single literal, not [LedgerVersion](../type-aliases/LedgerVersion.md), so a value typed
by it DISCRIMINATES — the same discipline `CurrentPipelineEra` follows in
`midnight-js-contracts`.

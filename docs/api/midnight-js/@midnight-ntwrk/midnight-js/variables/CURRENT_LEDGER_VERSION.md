[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / CURRENT\_LEDGER\_VERSION

# Variable: CURRENT\_LEDGER\_VERSION

> `const` **CURRENT\_LEDGER\_VERSION**: `"v9"`

The era whose objects this build links eagerly, today through `./v9`.

"Current" is relative: today it is ledger 9 (`'v9'`). At the next hard fork it
moves to the new ledger and ledger 9 joins RetainedLedgerVersion. Code
bound to one ledger is named after that ledger (`Ledger9*`) instead.

A protocol fact rather than a consumer's choice: it is decided by which
ledger the package links eagerly, and every other era is reached lazily and
crosses package boundaries as bytes. Declared here so that no package
downstream restates "which era is now" as a literal of its own.

The type is the single literal, not [LedgerVersion](../type-aliases/LedgerVersion.md), so a value typed
by it DISCRIMINATES: `midnight-js-contracts` types a current-era result's
`era` with it, so a union of both eras' results narrows on `era`.

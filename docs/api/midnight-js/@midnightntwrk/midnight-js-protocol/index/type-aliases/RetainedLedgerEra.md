[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / RetainedLedgerEra

# ~~Type Alias: RetainedLedgerEra~~

> **RetainedLedgerEra** = `Exclude`\<[`LedgerEra`](LedgerEra.md), [`CurrentLedgerEra`](CurrentLedgerEra.md)\>

Every era except [CURRENT\_LEDGER\_ERA](../variables/CURRENT_LEDGER_ERA.md). Today that is only ledger 8 (`'v8'`).

## Deprecated

Will be removed in the next major release. Use
`Exclude<LedgerEra, CurrentLedgerEra>` instead.

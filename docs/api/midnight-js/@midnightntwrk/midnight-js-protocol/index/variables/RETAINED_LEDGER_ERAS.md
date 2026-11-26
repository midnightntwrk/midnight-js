[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / RETAINED\_LEDGER\_ERAS

# ~~Variable: RETAINED\_LEDGER\_ERAS~~

> `const` **RETAINED\_LEDGER\_ERAS**: readonly \[`"v8"`\]

Every era except [CURRENT\_LEDGER\_ERA](CURRENT_LEDGER_ERA.md). Today that is only ledger 8 (`'v8'`).

## Deprecated

Will be removed in the next major release. Use
`LEDGER_ERAS.filter((era): era is Exclude<LedgerEra, CurrentLedgerEra> => era !== CURRENT_LEDGER_ERA)`
instead.

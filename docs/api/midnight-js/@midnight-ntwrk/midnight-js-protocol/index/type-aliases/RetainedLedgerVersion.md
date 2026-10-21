[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / RetainedLedgerVersion

# Type Alias: RetainedLedgerVersion

> **RetainedLedgerVersion** = `Exclude`\<[`LedgerVersion`](LedgerVersion.md), [`CurrentLedgerVersion`](CurrentLedgerVersion.md)\>

Every era this build still speaks but does not run live — the eras that
cross a package boundary as serialized bytes.

"Retained" is relative: today the set is ledger 8 (`'v8'`). At the next hard
fork the then-current ledger joins it. Code bound to one ledger is named
after that ledger (`Ledger8*`) instead.

Defined as the complement of [CURRENT\_LEDGER\_VERSION](../variables/CURRENT_LEDGER_VERSION.md), so a further
era joins this set by being added to [LEDGER\_VERSIONS](../variables/LEDGER_VERSIONS.md) and nothing
else. The value list below is checked against that complement at build time.

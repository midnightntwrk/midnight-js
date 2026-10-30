[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / AnyEraMaintenanceTxData

# Type Alias: AnyEraMaintenanceTxData

> **AnyEraMaintenanceTxData** = [`Ledger9FinalizedMaintenanceTxData`](../interfaces/Ledger9FinalizedMaintenanceTxData.md) \| [`Ledger8FinalizedMaintenanceTxData`](../interfaces/Ledger8FinalizedMaintenanceTxData.md)

A contract maintenance update recorded on chain, in either era. Narrowing on `era` narrows
`public` to that era's record; era-agnostic code reads `public` as a `FinalizedTxRead`.

## See

[isLedger8Result](../variables/isLedger8Result.md) to narrow it.

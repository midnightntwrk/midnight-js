[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / AnyEraMaintenanceTxData

# Type Alias: AnyEraMaintenanceTxData

> **AnyEraMaintenanceTxData** = [`FinalizedMaintenanceTxData`](../interfaces/FinalizedMaintenanceTxData.md) \| [`FinalizedMaintenanceTxData`](../namespaces/Ledger8/interfaces/FinalizedMaintenanceTxData.md)

A contract maintenance update recorded on chain, in either era. Narrowing on `era` narrows
`public` to that era's record; era-agnostic code reads `public` as a `VersionedFinalizedTxData`.

## See

[isLedger8Result](../functions/isLedger8Result.md) to narrow it.

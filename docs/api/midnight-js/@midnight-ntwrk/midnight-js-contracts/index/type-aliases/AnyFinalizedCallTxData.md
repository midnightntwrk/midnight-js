[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / AnyFinalizedCallTxData

# Type Alias: AnyFinalizedCallTxData

> **AnyFinalizedCallTxData** = `WithOpaqueCircuitValues`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<[`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk), [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<[`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)\>\>\> \| [`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<[`Ledger8Contract`](../interfaces/Ledger8Contract.md), [`Ledger8CircuitId`](Ledger8CircuitId.md)\<[`Ledger8Contract`](../interfaces/Ledger8Contract.md)\>\>

A finalized circuit call of any contract, in either era. Its `result` and `nextPrivateState` are
`unknown`. Narrow it with `isLedger8Result`; name the contract to get precise types back.

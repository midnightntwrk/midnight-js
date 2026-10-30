[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / AnySubmittedCallTx

# Type Alias: AnySubmittedCallTx

> **AnySubmittedCallTx** = `Omit`\<[`Ledger9SubmittedCallTx`](../interfaces/Ledger9SubmittedCallTx.md)\<[`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk), [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<[`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)\>\>, `"callTxData"`\> & `object` \| [`Ledger8SubmittedCallTx`](../interfaces/Ledger8SubmittedCallTx.md)\<[`Ledger8Contract`](../interfaces/Ledger8Contract.md), [`Ledger8CircuitId`](Ledger8CircuitId.md)\<[`Ledger8Contract`](../interfaces/Ledger8Contract.md)\>\>

A submitted, not yet finalized circuit call of any contract, in either era. Its `result` and
`nextPrivateState` are `unknown`. Narrow it with `isLedger8Result`.

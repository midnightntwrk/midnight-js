[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / AnyEraSubmittedCallTx

# Type Alias: AnyEraSubmittedCallTx

> **AnyEraSubmittedCallTx** = `Omit`\<[`Ledger9SubmittedCallTx`](../interfaces/Ledger9SubmittedCallTx.md)\<[`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk), [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<[`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)\>\>, `"callTxData"`\> & `object` \| [`Ledger8SubmittedCallTx`](../interfaces/Ledger8SubmittedCallTx.md)\<[`Ledger8Contract`](../interfaces/Ledger8Contract.md), [`Ledger8CircuitId`](Ledger8CircuitId.md)\<[`Ledger8Contract`](../interfaces/Ledger8Contract.md)\>\>

What a submission that does not wait for finalization answers with, in
either era.

## See

[isLedger8Result](../functions/isLedger8Result.md) to narrow it.

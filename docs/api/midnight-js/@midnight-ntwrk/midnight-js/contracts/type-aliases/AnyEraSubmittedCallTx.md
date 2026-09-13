[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / AnyEraSubmittedCallTx

# Type Alias: AnyEraSubmittedCallTx

> **AnyEraSubmittedCallTx** = `Omit`\<[`SubmittedCallTx`](../interfaces/SubmittedCallTx.md)\<[`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk), [`Contract$1.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<[`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)\>\>, `"callTxData"`\> & `object` \| [`SubmittedCallTx`](../namespaces/Ledger8/interfaces/SubmittedCallTx.md)\<[`Contract`](../namespaces/Ledger8/interfaces/Contract.md), [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<[`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\>\>

What a submission that does not wait for finalization answers with, in
either era.

## See

[isLedger8Result](../variables/isLedger8Result.md) to narrow it.

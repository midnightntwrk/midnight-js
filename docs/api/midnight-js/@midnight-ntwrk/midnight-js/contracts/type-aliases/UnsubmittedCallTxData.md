[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnsubmittedCallTxData

# Type Alias: UnsubmittedCallTxData\<C, K\>

> **UnsubmittedCallTxData**\<`C`, `K`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `K` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9UnsubmittedCallTxData`](../interfaces/Ledger9UnsubmittedCallTxData.md)\<`C`, `K` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

A proven circuit call, not yet submitted. Generic code names an era: `Ledger9UnsubmittedCallTxData<C, K>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

### K

`K` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

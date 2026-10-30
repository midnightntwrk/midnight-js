[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FinalizedCallTxData

# Type Alias: FinalizedCallTxData\<C, PCK\>

> **FinalizedCallTxData**\<`C`, `PCK`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<`C`, `PCK` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

A finalized circuit call. Generic code names an era: `Ledger9FinalizedCallTxData<C, PCK>`.
A call of any contract, in either era, is [AnyFinalizedCallTxData](AnyFinalizedCallTxData.md).

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

### PCK

`PCK` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / FinalizedCallTxData

# Type Alias: FinalizedCallTxData\<C, K\>

> **FinalizedCallTxData**\<`C`, `K`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<`C`, `K` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `K` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

A finalized circuit call. Generic code names an era: `Ledger9FinalizedCallTxData<C, K>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

### K

`K` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallTxOptionsBase

# Type Alias: CallTxOptionsBase\<C, K\>

> **CallTxOptionsBase**\<`C`, `K`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8CallTxOptionsBase`](Ledger8CallTxOptionsBase.md)\<`C`, `K` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9CallTxOptionsBase`](Ledger9CallTxOptionsBase.md)\<`C`, `K` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

The options of a circuit call without private state. Generic code names an era: `Ledger9CallTxOptionsBase<C, K>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

### K

`K` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

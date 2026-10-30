[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / CallTxOptionsBase

# Type Alias: CallTxOptionsBase\<C, PCK\>

> **CallTxOptionsBase**\<`C`, `PCK`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8CallTxOptionsBase`](Ledger8CallTxOptionsBase.md)\<`C`, `PCK` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9CallTxOptionsBase`](Ledger9CallTxOptionsBase.md)\<`C`, `PCK` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

The options of a circuit call without private state. Generic code names an era: `Ledger9CallTxOptionsBase<C, PCK>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

### PCK

`PCK` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

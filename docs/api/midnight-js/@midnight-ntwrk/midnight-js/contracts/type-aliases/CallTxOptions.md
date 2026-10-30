[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallTxOptions

# Type Alias: CallTxOptions\<C, PCK\>

> **CallTxOptions**\<`C`, `PCK`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8CallTxOptions`](Ledger8CallTxOptions.md)\<`C`, `PCK` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9CallTxOptions`](Ledger9CallTxOptions.md)\<`C`, `PCK` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

The options of a circuit call. Generic code names an era: `Ledger9CallTxOptions<C, PCK>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

### PCK

`PCK` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

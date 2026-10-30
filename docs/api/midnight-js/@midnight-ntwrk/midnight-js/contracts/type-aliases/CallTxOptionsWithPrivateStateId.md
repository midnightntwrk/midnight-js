[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallTxOptionsWithPrivateStateId

# Type Alias: CallTxOptionsWithPrivateStateId\<C, K\>

> **CallTxOptionsWithPrivateStateId**\<`C`, `K`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8CallTxOptionsWithPrivateStateId`](Ledger8CallTxOptionsWithPrivateStateId.md)\<`C`, `K` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9CallTxOptionsWithPrivateStateId`](Ledger9CallTxOptionsWithPrivateStateId.md)\<`C`, `K` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

The options of a circuit call with a private state id. Generic code names an era: `Ledger9CallTxOptionsWithPrivateStateId<C, K>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

### K

`K` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

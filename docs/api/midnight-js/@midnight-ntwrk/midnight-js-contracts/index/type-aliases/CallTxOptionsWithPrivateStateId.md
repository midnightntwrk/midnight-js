[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / CallTxOptionsWithPrivateStateId

# Type Alias: CallTxOptionsWithPrivateStateId\<C, PCK\>

> **CallTxOptionsWithPrivateStateId**\<`C`, `PCK`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8CallTxOptionsWithPrivateStateId`](Ledger8CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9CallTxOptionsWithPrivateStateId`](Ledger9CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

The options of a circuit call with a private state id. Generic code names an era: `Ledger9CallTxOptionsWithPrivateStateId<C, PCK>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

### PCK

`PCK` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

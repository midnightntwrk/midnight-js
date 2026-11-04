[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / SubmittedCallTx

# Type Alias: SubmittedCallTx\<C, PCK\>

> **SubmittedCallTx**\<`C`, `PCK`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8SubmittedCallTx`](../interfaces/Ledger8SubmittedCallTx.md)\<`C`, `PCK` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9SubmittedCallTx`](../interfaces/Ledger9SubmittedCallTx.md)\<`C`, `PCK` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

A submitted, not yet finalized circuit call. Generic code names an era: `Ledger9SubmittedCallTx<C, PCK>`.
A submission of any contract, in either era, is [AnySubmittedCallTx](AnySubmittedCallTx.md).

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

### PCK

`PCK` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

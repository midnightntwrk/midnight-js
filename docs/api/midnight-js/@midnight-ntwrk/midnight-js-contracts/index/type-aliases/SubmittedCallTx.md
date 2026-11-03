[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmittedCallTx

# Type Alias: SubmittedCallTx\<C, K\>

> **SubmittedCallTx**\<`C`, `K`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8SubmittedCallTx`](../interfaces/Ledger8SubmittedCallTx.md)\<`C`, `K` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9SubmittedCallTx`](../interfaces/Ledger9SubmittedCallTx.md)\<`C`, `K` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

A submitted, not yet finalized circuit call. Generic code names an era: `Ledger9SubmittedCallTx<C, K>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

### K

`K` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

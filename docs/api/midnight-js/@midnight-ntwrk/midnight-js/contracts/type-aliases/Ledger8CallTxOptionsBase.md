[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8CallTxOptionsBase

# Type Alias: Ledger8CallTxOptionsBase\<C, PCK\>

> **Ledger8CallTxOptionsBase**\<`C`, `PCK`\> = [`Ledger8CircuitParameters`](Ledger8CircuitParameters.md)\<`C`, `PCK`\> *extends* \[\] ? [`Ledger8CallTxTarget`](../interfaces/Ledger8CallTxTarget.md)\<`C`, `PCK`\> : [`Ledger8CallTxTarget`](../interfaces/Ledger8CallTxTarget.md)\<`C`, `PCK`\> & `object`

Base configuration for a retained-era call transaction.

`args` is CONDITIONAL, mirroring the current era's `Ledger9CallOptionsWithArguments`: a circuit that
takes no arguments of its own has no `args` member at all, rather than one the caller has to
satisfy with an empty array, so the two eras do not disagree about the same zero-argument
circuit.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)

### PCK

`PCK` *extends* [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>

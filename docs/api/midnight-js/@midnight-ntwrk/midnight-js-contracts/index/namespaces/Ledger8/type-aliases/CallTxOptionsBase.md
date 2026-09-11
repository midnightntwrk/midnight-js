[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CallTxOptionsBase

# Type Alias: CallTxOptionsBase\<C, K\>

> **CallTxOptionsBase**\<`C`, `K`\> = [`CircuitParameters`](CircuitParameters.md)\<`C`, `K`\> *extends* \[\] ? [`CallTxTarget`](../interfaces/CallTxTarget.md)\<`C`, `K`\> : [`CallTxTarget`](../interfaces/CallTxTarget.md)\<`C`, `K`\> & `object`

Base configuration for a retained-era call transaction.

`args` is CONDITIONAL, mirroring the current era's `CallOptionsWithArguments`: a circuit that
takes no arguments of its own has no `args` member at all, rather than one the caller has to
satisfy with an empty array, so the two eras do not disagree about the same zero-argument
circuit.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)

### K

`K` *extends* [`CircuitId`](CircuitId.md)\<`C`\>

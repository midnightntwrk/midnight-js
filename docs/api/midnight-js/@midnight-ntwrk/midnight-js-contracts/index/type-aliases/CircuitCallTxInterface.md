[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / CircuitCallTxInterface

# Type Alias: CircuitCallTxInterface\<C\>

> **CircuitCallTxInterface**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8CircuitCallTxInterface`](Ledger8CircuitCallTxInterface.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9CircuitCallTxInterface`](Ledger9CircuitCallTxInterface.md)\<`C`\> : `never`

One call function per circuit. Generic code names an era: `Ledger9CircuitCallTxInterface<C>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

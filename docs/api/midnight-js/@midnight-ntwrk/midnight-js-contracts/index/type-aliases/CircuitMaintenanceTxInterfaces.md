[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / CircuitMaintenanceTxInterfaces

# Type Alias: CircuitMaintenanceTxInterfaces\<C\>

> **CircuitMaintenanceTxInterfaces**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8CircuitMaintenanceTxInterfaces`](Ledger8CircuitMaintenanceTxInterfaces.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9CircuitMaintenanceTxInterfaces`](Ledger9CircuitMaintenanceTxInterfaces.md)\<`C`\> : `never`

One maintenance interface per circuit. Generic code names an era: `Ledger9CircuitMaintenanceTxInterfaces<C>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

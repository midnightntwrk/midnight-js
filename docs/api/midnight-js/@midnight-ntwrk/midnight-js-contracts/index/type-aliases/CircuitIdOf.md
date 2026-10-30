[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / CircuitIdOf

# Type Alias: CircuitIdOf\<C\>

> **CircuitIdOf**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\> : `never`

The circuit ids of `C`, read the way the era that compiled `C` reads them.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / ContractProviders

# Type Alias: ContractProviders\<C, K\>

> **ContractProviders**\<`C`, `K`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8ContractProviders`](Ledger8ContractProviders.md)\<`C`, `K` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9ContractProviders`](Ledger9ContractProviders.md)\<`C`, `K` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

The providers a contract needs. With no contract named, the ledger 9 set.
Generic code names an era: `Ledger9ContractProviders<C, K>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md) = [`Ledger9Contract`](Ledger9Contract.md)

### K

`K` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\> = [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CircuitMaintenanceTxInterfaces

# Type Alias: CircuitMaintenanceTxInterfaces\<C\>

> **CircuitMaintenanceTxInterfaces**\<`C`\> = `Record`\<[`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, [`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)\>

Defined in: packages/contracts/dist/index.d.ts:292

A set of maintenance transaction creation interfaces, one for each circuit defined in
a given contract, keyed by the circuit name.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

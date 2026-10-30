[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FindDeployedContractOptions

# Type Alias: FindDeployedContractOptions\<C\>

> **FindDeployedContractOptions**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8FindDeployedContractOptions`](../interfaces/Ledger8FindDeployedContractOptions.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9FindDeployedContractOptions`](Ledger9FindDeployedContractOptions.md)\<`C`\> : `never`

The options of `findDeployedContract`. Generic code names an era: `Ledger9FindDeployedContractOptions<C>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

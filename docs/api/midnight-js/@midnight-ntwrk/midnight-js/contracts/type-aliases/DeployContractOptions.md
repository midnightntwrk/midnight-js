[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DeployContractOptions

# Type Alias: DeployContractOptions\<C\>

> **DeployContractOptions**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8DeployContractOptions`](Ledger8DeployContractOptions.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9DeployContractOptions`](Ledger9DeployContractOptions.md)\<`C`\> : `never`

The options of `deployContract`. Generic code names an era: `Ledger9DeployContractOptions<C>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

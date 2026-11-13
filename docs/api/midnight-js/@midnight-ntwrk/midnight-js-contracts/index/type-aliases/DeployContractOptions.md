[**Midnight.js API Reference v5.0.1-rc.1**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / DeployContractOptions

# Type Alias: DeployContractOptions\<C\>

> **DeployContractOptions**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8DeployContractOptions`](Ledger8DeployContractOptions.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9DeployContractOptions`](Ledger9DeployContractOptions.md)\<`C`\> : `never`

The options of `deployContract`. Generic code names an era: `Ledger9DeployContractOptions<C>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

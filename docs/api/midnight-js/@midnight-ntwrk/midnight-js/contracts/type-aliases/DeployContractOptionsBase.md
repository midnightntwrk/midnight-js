[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DeployContractOptionsBase

# Type Alias: DeployContractOptionsBase\<C\>

> **DeployContractOptionsBase**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8DeployContractOptionsBase`](../interfaces/Ledger8DeployContractOptionsBase.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9DeployContractOptionsBase`](Ledger9DeployContractOptionsBase.md)\<`C`\> : `never`

The options of `deployContract` without private state. Generic code names an era: `Ledger9DeployContractOptionsBase<C>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

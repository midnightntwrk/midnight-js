[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DeployedContract

# Type Alias: DeployedContract\<C\>

> **DeployedContract**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8DeployedContract`](../interfaces/Ledger8DeployedContract.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9DeployedContract`](../interfaces/Ledger9DeployedContract.md)\<`C`\> : `never`

The contract a deploy created. Generic code names an era: `Ledger9DeployedContract<C>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

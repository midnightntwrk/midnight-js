[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FoundDeployTxData

# Type Alias: FoundDeployTxData\<C\>

> **FoundDeployTxData**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8FoundDeployTxData`](../interfaces/Ledger8FoundDeployTxData.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9FoundDeployTxData`](../interfaces/Ledger9FoundDeployTxData.md)\<`C`\> : `never`

The deploy transaction of a found contract. Generic code names an era: `Ledger9FoundDeployTxData<C>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / FinalizedDeployTxData

# Type Alias: FinalizedDeployTxData\<C\>

> **FinalizedDeployTxData**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8FinalizedDeployTxData`](../interfaces/Ledger8FinalizedDeployTxData.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9FinalizedDeployTxData`](../interfaces/Ledger9FinalizedDeployTxData.md)\<`C`\> : `never`

A finalized deploy. Generic code names an era: `Ledger9FinalizedDeployTxData<C>` or `Ledger8FinalizedDeployTxData<C>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

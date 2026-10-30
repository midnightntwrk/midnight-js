[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DeployContractOptionsWithPrivateState

# Type Alias: DeployContractOptionsWithPrivateState\<C\>

> **DeployContractOptionsWithPrivateState**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8DeployContractOptionsWithPrivateState`](../interfaces/Ledger8DeployContractOptionsWithPrivateState.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9DeployContractOptionsWithPrivateState`](Ledger9DeployContractOptionsWithPrivateState.md)\<`C`\> : `never`

The options of `deployContract` with private state. Generic code names an era: `Ledger9DeployContractOptionsWithPrivateState<C>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

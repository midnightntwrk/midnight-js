[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / AnyEraDeployedContract

# Type Alias: AnyEraDeployedContract\<C, L8\>

> **AnyEraDeployedContract**\<`C`, `L8`\> = [`Ledger9DeployedContract`](../interfaces/Ledger9DeployedContract.md)\<`C`\> \| [`Ledger8DeployedContract`](../interfaces/Ledger8DeployedContract.md)\<`L8`\>

A contract deployed by `deployContract`, in either era.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

The current-era contract.

### L8

`L8` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)

The retained-era contract.

## See

[isLedger8Result](../functions/isLedger8Result.md) to narrow it.

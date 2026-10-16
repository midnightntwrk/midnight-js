[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / AnyEraDeployedContract

# Type Alias: AnyEraDeployedContract\<C, L8\>

> **AnyEraDeployedContract**\<`C`, `L8`\> = [`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\> \| [`DeployedContract`](../namespaces/Ledger8/interfaces/DeployedContract.md)\<`L8`\>

A contract deployed by `deployContract`, in either era.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

The current-era contract.

### L8

`L8` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)

The retained-era contract.

## See

[isLedger8Result](../functions/isLedger8Result.md) to narrow it.

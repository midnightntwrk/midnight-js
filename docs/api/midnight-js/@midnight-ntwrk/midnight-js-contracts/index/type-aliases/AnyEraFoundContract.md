[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / AnyEraFoundContract

# Type Alias: AnyEraFoundContract\<C, L8\>

> **AnyEraFoundContract**\<`C`, `L8`\> = [`FoundContract`](../interfaces/FoundContract.md)\<`C`\> \| [`FoundContract`](../namespaces/Ledger8/interfaces/FoundContract.md)\<`L8`\>

A contract found on chain by `findDeployedContract`, in either era.

Generic over both contract types, because a handle's call interfaces are typed by its contract:
a found contract is not assignable to the widest instantiation the call-result unions use.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

The current-era contract.

### L8

`L8` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)

The retained-era contract.

## See

[isLedger8Result](../functions/isLedger8Result.md) to narrow it.

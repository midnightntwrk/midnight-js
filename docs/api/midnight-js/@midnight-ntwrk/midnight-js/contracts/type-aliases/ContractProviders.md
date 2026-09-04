[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractProviders

# Type Alias: ContractProviders\<C, PCK, PS\>

> **ContractProviders**\<`C`, `PCK`, `PS`\> = [`MidnightProviders`](../../types/interfaces/MidnightProviders.md)\<`PCK`, [`PrivateStateId`](../../types/type-aliases/PrivateStateId.md), `PS`\>

Defined in: packages/contracts/dist/index.d.ts:258

Convenience type for representing the set of providers necessary to use
a given contract.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk) = [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\> = [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

### PS

`PS` = [`Contract.PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

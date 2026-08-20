[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / ContractProviders

# Type Alias: ContractProviders\<C, PCK, PS\>

> **ContractProviders**\<`C`, `PCK`, `PS`\> = [`MidnightProviders`](../../midnight-js/types/interfaces/MidnightProviders.md)\<`PCK`, [`PrivateStateId`](../../midnight-js/types/type-aliases/PrivateStateId.md), `PS`\>

Convenience type for representing the set of providers necessary to use
a given contract.

## Type Parameters

### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md) = [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### PCK

`PCK` *extends* [`ProvableCircuitId`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\> = [`ProvableCircuitId`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>

### PS

`PS` = [`PrivateState`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/PrivateState.md)\<`C`\>

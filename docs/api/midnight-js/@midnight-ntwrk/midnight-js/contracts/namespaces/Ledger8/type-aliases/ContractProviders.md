[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / ContractProviders

# Type Alias: ContractProviders\<C, K\>

> **ContractProviders**\<`C`, `K`\> = [`MidnightProviders`](../../../../types/interfaces/MidnightProviders.md)\<`K`, [`PrivateStateId`](../../../../types/type-aliases/PrivateStateId.md), [`PrivateState`](PrivateState.md)\<`C`\>\>

The providers a retained-era call transaction needs.

The same provider set the current era uses, keyed by the retained-era circuit
id.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)

### K

`K` *extends* [`CircuitId`](CircuitId.md)\<`C`\>

## See

[OverloadTyping](../../../../documents/OverloadTyping.md) for why there is no separate retained-era provider
     surface.

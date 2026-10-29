[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8ContractProviders

# Type Alias: Ledger8ContractProviders\<C, K\>

> **Ledger8ContractProviders**\<`C`, `K`\> = [`MidnightProviders`](../../../midnight-js/types/interfaces/MidnightProviders.md)\<`K`, [`PrivateStateId`](../../../midnight-js/types/type-aliases/PrivateStateId.md), [`Ledger8PrivateState`](Ledger8PrivateState.md)\<`C`\>\>

The providers a retained-era call transaction needs.

The same provider set the current era uses, keyed by the retained-era circuit
id.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)

### K

`K` *extends* [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>

## See

[OverloadTyping](../../documents/OverloadTyping.md) for why there is no separate retained-era provider
     surface.

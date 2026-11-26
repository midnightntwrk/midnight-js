[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8ContractProviders

# Type Alias: Ledger8ContractProviders\<C, PCK\>

> **Ledger8ContractProviders**\<`C`, `PCK`\> = [`MidnightProviders`](../../types/interfaces/MidnightProviders.md)\<`PCK`, [`PrivateStateId`](../../types/type-aliases/PrivateStateId.md), [`Ledger8PrivateState`](Ledger8PrivateState.md)\<`C`\>\>

The providers a ledger 8 call transaction needs.

The same provider set the current era uses, keyed by the ledger 8 circuit
id.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)

### PCK

`PCK` *extends* [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>

## See

[OverloadTyping](../../documents/OverloadTyping.md) for why there is no separate ledger 8 provider
     surface.

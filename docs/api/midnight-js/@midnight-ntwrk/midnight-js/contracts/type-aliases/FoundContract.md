[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FoundContract

# Type Alias: FoundContract\<C\>

> **FoundContract**\<`C`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? [`Ledger8FoundContract`](../interfaces/Ledger8FoundContract.md)\<`C`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9FoundContract`](../interfaces/Ledger9FoundContract.md)\<`C`\> : `never`

The contract found at an address. Generic code names an era: `Ledger9FoundContract<C>`.

## Type Parameters

### C

`C` *extends* [`AnyEraContract`](AnyEraContract.md)

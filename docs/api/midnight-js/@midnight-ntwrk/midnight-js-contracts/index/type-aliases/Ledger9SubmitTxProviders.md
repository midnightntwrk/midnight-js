[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9SubmitTxProviders

# Type Alias: Ledger9SubmitTxProviders\<C, PCK\>

> **Ledger9SubmitTxProviders**\<`C`, `PCK`\> = `Omit`\<[`Ledger9ContractProviders`](Ledger9ContractProviders.md)\<`C`, `PCK`\>, `"privateStateProvider"`\>

Providers required to submit a ledger 9 transaction. Submission doesn't manipulate private state,
so the private state provider can be omitted.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

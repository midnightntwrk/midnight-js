[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / SubmitTxProviders

# Type Alias: SubmitTxProviders\<C, PCK\>

> **SubmitTxProviders**\<`C`, `PCK`\> = `Omit`\<[`ContractProviders`](ContractProviders.md)\<`C`, `PCK`\>, `"privateStateProvider"`\>

Defined in: packages/contracts/dist/index.d.ts:393

Providers required to submit an unproven deployment transaction. Since [submitTx](../variables/submitTx.md) doesn't
manipulate private state, the private state provider can be omitted.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

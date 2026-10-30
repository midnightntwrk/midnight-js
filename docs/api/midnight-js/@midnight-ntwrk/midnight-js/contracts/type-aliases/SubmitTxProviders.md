[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / SubmitTxProviders

# Type Alias: SubmitTxProviders\<C, PCK\>

> **SubmitTxProviders**\<`C`, `PCK`\> = `C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md) ? `Omit`\<[`Ledger8ContractProviders`](Ledger8ContractProviders.md)\<`C`, `PCK` & [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>\>, `"privateStateProvider"`\> : `C` *extends* [`Ledger9Contract`](Ledger9Contract.md) ? [`Ledger9SubmitTxProviders`](Ledger9SubmitTxProviders.md)\<`C`, `PCK` & [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>\> : `never`

The providers that submit a transaction of `C`: the provider set of the era that compiled `C`,
without a private state provider. Generic code names an era: `Ledger9SubmitTxProviders<C, PCK>`.

## Type Parameters

### C

`C` *extends* [`AnyContract`](AnyContract.md)

### PCK

`PCK` *extends* [`CircuitIdOf`](CircuitIdOf.md)\<`C`\>

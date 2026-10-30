[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / withLedger9ContractScopedTransaction

# Variable: withLedger9ContractScopedTransaction

> `const` **withLedger9ContractScopedTransaction**: \<`C`, `PCK`\>(`providers`, `fn`, `options?`) => `Promise`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Executes a function within a contract-scoped transaction on a ledger 9 head. The rules are those of
[withContractScopedTransaction](withContractScopedTransaction.md).

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\> = [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Parameters

### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`, `PCK`\>

### fn

(`txCtx`) => `Promise`\<`void`\>

### options?

[`ScopedTransactionOptions`](../interfaces/ScopedTransactionOptions.md)

## Returns

`Promise`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

## Throws

with reason `'scope-on-ledger8-network'` when the network is not on ledger 9.
        Raised before `fn` runs.

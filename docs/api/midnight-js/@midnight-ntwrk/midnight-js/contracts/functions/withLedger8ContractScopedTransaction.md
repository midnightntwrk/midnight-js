[**Midnight.js API Reference v5.0.0-rc.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / withLedger8ContractScopedTransaction

# Function: withLedger8ContractScopedTransaction()

> **withLedger8ContractScopedTransaction**\<`C`, `PCK`\>(`providers`, `fn`, `options?`): `Promise`\<[`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Executes a function within a contract-scoped transaction on a ledger 8 (pre-fork) head. The rules are
those of [withContractScopedTransaction](withContractScopedTransaction.md).

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### PCK

`PCK` *extends* `string`

## Parameters

### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, `PCK`\>

### fn

(`txCtx`) => `Promise`\<`void`\>

### options?

[`ScopedTransactionOptions`](../interfaces/ScopedTransactionOptions.md)

## Returns

`Promise`\<[`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<`C`, `PCK`\>\>

## Throws

with reason `'scope-era-mismatch'` when the network is not on ledger 8.
        Raised before `fn` runs, and before the ledger 8 runtime is loaded.

## Remarks

A JavaScript caller that passes a running ledger 8 scope's context in place of `options` runs `fn`
inside that scope. Nothing is submitted then, and the result is the execution data of the scope's
last call, not a finalized transaction.

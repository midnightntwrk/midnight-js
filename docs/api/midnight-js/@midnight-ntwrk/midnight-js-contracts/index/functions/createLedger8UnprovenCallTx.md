[**Midnight.js API Reference v5.0.0**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createLedger8UnprovenCallTx

# Function: createLedger8UnprovenCallTx()

> **createLedger8UnprovenCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext?`): `Promise`\<[`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### PCK

`PCK` *extends* `string`

## Parameters

### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, `PCK`\>

The providers to use to create the call transaction. `privateStateProvider`, when
       given, is pointed at `options.contractAddress`; its state is read only when
       `options.privateStateId` is given.

### options

[`Ledger8CallTxOptions`](../type-aliases/Ledger8CallTxOptions.md)\<`C`, `PCK`\>

Configuration.

### transactionContext?

[`Ledger8TransactionContext`](../interfaces/Ledger8TransactionContext.md)\<`C`, `PCK`\>

Optional ledger 8 scope to build the call in.

## Returns

`Promise`\<[`Ledger8UnsubmittedCallTxData`](../interfaces/Ledger8UnsubmittedCallTxData.md)\<`C`, `PCK`\>\>

All data produced by the circuit call and the unproven transaction.

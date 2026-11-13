[**Midnight.js API Reference v5.0.1-rc.1**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / withContractScopedTransaction

# Function: withContractScopedTransaction()

## Call Signature

> **withContractScopedTransaction**\<`C`, `PCK`\>(`providers`, `fn`, `options?`): `Promise`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Executes a function within the context of a contract-scoped transaction, on the ledger era the
network head is on: a ledger 8 head runs [withLedger8ContractScopedTransaction](withLedger8ContractScopedTransaction.md), a ledger 9 head
[withLedger9ContractScopedTransaction](../variables/withLedger9ContractScopedTransaction.md).

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string` = [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`, `PCK`\>

The contract providers to use within the transaction.

#### fn

(`txCtx`) => `Promise`\<`void`\>

The function to execute within the transaction context.

#### options?

[`ScopedTransactionOptions`](../interfaces/ScopedTransactionOptions.md)

Optional transaction scope options.

### Returns

`Promise`\<[`Ledger9FinalizedCallTxData`](../interfaces/Ledger9FinalizedCallTxData.md)\<`C`, `PCK`\>\>

A `Promise` that resolves with the finalized transaction data of the single transaction
created for all circuit calls made within `fn`.

### Remarks

Where `fn` makes circuit calls, these are batched together and submitted as a single transaction when
the function completes successfully. If `fn` throws an error, any unsubmitted circuit calls are discarded.

The ledger era this scope runs against is read ONCE, before `fn` runs, and every call merged into
the scope shares that one reading. Before the hard fork the scope takes calls against contracts
produced by the ledger 8 Compact toolchain; type `fn`'s parameter as [Ledger8TransactionContext](../interfaces/Ledger8TransactionContext.md)
to call them. After the fork it takes calls against contracts produced by the ledger 9 toolchain, and a
ledger 8 contract's calls are submitted individually with `submitCallTx`.

A JavaScript caller that passes a running scope's context in place of `options` runs `fn` inside that
scope. Nothing is submitted then, and the result is the execution data of the scope's last call, not
a finalized transaction.

## Call Signature

> **withContractScopedTransaction**\<`C`, `PCK`\>(`providers`, `fn`, `options?`): `Promise`\<[`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Executes a function within a contract-scoped transaction on a ledger 8 (pre-fork) network. The rules
are those of the overload above.

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, `PCK`\>

#### fn

(`txCtx`) => `Promise`\<`void`\>

#### options?

[`ScopedTransactionOptions`](../interfaces/ScopedTransactionOptions.md)

### Returns

`Promise`\<[`Ledger8FinalizedCallTxData`](../interfaces/Ledger8FinalizedCallTxData.md)\<`C`, `PCK`\>\>

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / withContractScopedTransaction

# Variable: withContractScopedTransaction

> `const` **withContractScopedTransaction**: \<`C`, `PCK`\>(`providers`, `fn`, `options?`) => `Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Executes a function within the context of a contract-scoped transaction.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\> = [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, `PCK`\>

The contract providers to use within the transaction.

### fn

(`txCtx`) => `Promise`\<`void`\>

The function to execute within the transaction context.

### options?

[`ScopedTransactionOptions`](../interfaces/ScopedTransactionOptions.md)

Optional transaction scope options.

## Returns

`Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

A `Promise` that resolves with the finalized transaction data of the single transaction
created for all circuit calls made within `fn`.

## Throws

When the network head is on a ledger era that composes only
        one call per transaction, so has nothing for a scope to batch into. Raised before `fn`
        runs, so no circuit is executed and no private state is touched.

## Remarks

Where `fn` make circuit calls, these are batched together and submitted as a single transaction when
the function completes successfully. If `fn` throws an error, any unsubmitted circuit calls are discarded.

The ledger era this scope runs against is read ONCE, before `fn` runs, and every call merged into
the scope shares that one reading — the same single-snapshot discipline the scope already applies
to the block it pins. A contract produced by the retained Compact toolchain cannot join a scope at
all; submit those calls individually with `submitCallTx`.

[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / submitCallTx

# Function: submitCallTx()

Creates and submits a transaction for the invocation of a circuit on a given contract.

## Transaction Execution Phases

Midnight transactions execute in two phases:
1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success

## Failure Behavior

**Guaranteed Phase Failure:**
- Transaction is rejected and not included in the blockchain
- `CallTxFailedError` is thrown with transaction data and circuit ID
- Private state updates are NOT stored (state remains unchanged)
- No on-chain record of the failed transaction

**Fallible Phase Failure:**
- Transaction is recorded on-chain with non-`SucceedEntirely` status
- `CallTxFailedError` is thrown with transaction data and circuit ID
- Private state updates are NOT stored (state remains unchanged)
- Transaction appears in blockchain history as partial success

## Param

**providers**

The providers used to manage the invocation lifecycle.

## Param

**options**

Configuration.

## Param

**transactionContext**

Optional scoped transaction context to participate in an
       existing transaction scope.

## Throws

When transaction fails in either guaranteed or fallible phase.
        The error contains the finalized transaction data and circuit ID for debugging.

## Throws

When `options.compiledContract` belongs to neither Compact
        era, is a raw current-era contract instance passed instead of its `CompiledContract`
        container, or its artifacts declare no toolchain this framework can place. Raised before
        anything is built or submitted; the ZK config provider is asked for the artifacts'
        declared runtime version, and no other provider is consulted.

## Remarks

The returned [FinalizedCallTxData](../interfaces/FinalizedCallTxData.md) (and the [CallResult](../interfaces/CallResult.md) variant)
is privacy-sensitive and carries the unproven transaction and private
state. See those types for handling guidance before logging, serializing,
or transmitting the result.

## Call Signature

> **submitCallTx**\<`C`, `K`\>(`providers`, `options`): `Promise`\<[`FinalizedCallTxData`](../namespaces/Ledger8/interfaces/FinalizedCallTxData.md)\<`C`, `K`\>\>

The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

Which pipeline runs is decided by the NETWORK HEAD, not by this overload: a pre-fork head runs
the retained-era-native pipeline, a post-fork head the keep-state one.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

#### K

`K` *extends* `string`

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, `K`\>

#### options

[`CallTxOptions`](../namespaces/Ledger8/type-aliases/CallTxOptions.md)\<`C`, `K`\>

### Returns

`Promise`\<[`FinalizedCallTxData`](../namespaces/Ledger8/interfaces/FinalizedCallTxData.md)\<`C`, `K`\>\>

### See

 - [KeepStatePipeline](../../documents/KeepStatePipeline.md) for the seam table, and for why a provider needs to handle the
     `'v8'` seam arm only while the network head is still pre-fork.
 - [OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Calls a circuit on a contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`SubmitTxProviders`](../type-aliases/SubmitTxProviders.md)\<`C`, `PCK`\>

#### options

[`CallTxOptionsBase`](../type-aliases/CallTxOptionsBase.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

Calls a circuit on a contract that declares private state, naming where that state is stored.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`CallTxOptionsWithPrivateStateId`](../type-aliases/CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`FinalizedCallTxData`](../interfaces/FinalizedCallTxData.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext`): `Promise`\<[`CallResult`](../interfaces/CallResult.md)\<`C`, `PCK`\>\>

Calls a circuit inside a scoped transaction, on a contract that declares private state. The
call is added to the scope rather than submitted on its own.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`CallTxOptionsWithPrivateStateId`](../type-aliases/CallTxOptionsWithPrivateStateId.md)\<`C`, `PCK`\>

#### transactionContext

[`TransactionContext`](../interfaces/TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`CallResult`](../interfaces/CallResult.md)\<`C`, `PCK`\>\>

## Call Signature

> **submitCallTx**\<`C`, `PCK`\>(`providers`, `options`, `transactionContext`): `Promise`\<[`CallResult`](../interfaces/CallResult.md)\<`C`, `PCK`\>\>

Calls a circuit inside a scoped transaction, on a contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`SubmitTxProviders`](../type-aliases/SubmitTxProviders.md)\<`C`, `PCK`\>

#### options

[`CallTxOptionsBase`](../type-aliases/CallTxOptionsBase.md)\<`C`, `PCK`\>

#### transactionContext

[`TransactionContext`](../interfaces/TransactionContext.md)\<`C`, `PCK`\>

### Returns

`Promise`\<[`CallResult`](../interfaces/CallResult.md)\<`C`, `PCK`\>\>

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitCallTxAsync

# Function: submitCallTxAsync()

## Call Signature

> **submitCallTxAsync**\<`C`, `K`\>(`providers`, `options`): `Promise`\<[`SubmittedCallTx`](../namespaces/Ledger8/interfaces/SubmittedCallTx.md)\<`C`, `K`\>\>

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

`Promise`\<[`SubmittedCallTx`](../namespaces/Ledger8/interfaces/SubmittedCallTx.md)\<`C`, `K`\>\>

### See

 - [KeepStatePipeline](../../documents/KeepStatePipeline.md) for the seam table, and for why a provider needs to handle the
     `'v8'` seam arm only while the network head is still pre-fork.
 - [OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.

## Call Signature

> **submitCallTxAsync**\<`C`, `PCK`\>(`providers`, `options`): `Promise`\<[`SubmittedCallTx`](../interfaces/SubmittedCallTx.md)\<`C`, `PCK`\>\>

Creates and submits a transaction for the invocation of a circuit on a given contract,
returning immediately after submission without waiting for finalization.

Unlike [submitCallTx](submitCallTx.md), this function does not wait for transaction finalization,
check transaction status, or update private state. The caller must handle these steps manually.

## Transaction Execution Phases

Midnight transactions execute in two phases:
1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success

## Manual Post-Submission Steps

After calling this function, you must manually:
1. Watch for transaction finalization using `providers.publicDataProvider.watchForTxData(txId)`
2. Check transaction status (compare against `SucceedEntirely`)
3. Handle failures appropriately (throw errors, log, etc.)
4. Update private state if transaction succeeded and `privateStateId` was provided

## Failure Behavior (Manual Handling Required)

**Guaranteed Phase Failure:**
- Transaction is rejected and not included in the blockchain
- `watchForTxData` may reject or return error status
- You must NOT store private state updates

**Fallible Phase Failure:**
- Transaction is recorded on-chain with non-`SucceedEntirely` status
- `watchForTxData` returns transaction data with failed status
- You must NOT store private state updates
- Transaction appears in blockchain history as partial success

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`SubmitCallTxProviders`](../type-aliases/SubmitCallTxProviders.md)\<`C`, `PCK`\>

The providers used to manage the invocation lifecycle.

#### options

[`CallTxOptions`](../type-aliases/CallTxOptions.md)\<`C`, `PCK`\>

Configuration.

### Returns

`Promise`\<[`SubmittedCallTx`](../interfaces/SubmittedCallTx.md)\<`C`, `PCK`\>\>

A `Promise` that resolves with the transaction ID and call transaction data immediately after submission;
        or rejects with an error if the submission fails.

### Throws

When `options.compiledContract` belongs to neither Compact
        era, is a raw current-era contract instance passed instead of its `CompiledContract`
        container, or its artifacts declare no toolchain this framework can place. Raised before
        anything is built or submitted; the ZK config provider is asked for the artifacts'
        declared runtime version, and no other provider is consulted.

### Remarks

The returned [SubmittedCallTx](../interfaces/SubmittedCallTx.md) is privacy-sensitive and carries the
unproven transaction and private state via `callTxData`. See that type for
handling guidance before logging, serializing, or transmitting the result.

### Example

```typescript
// 1. Submit
const { txId, callTxData } = await submitCallTxAsync(providers, options);

// 2. Watch (when ready). The read surface reports both ledger eras, so the
//    record is version-tagged.
const record = await providers.publicDataProvider.watchForTxData(txId);

// 3. Narrow to the v9 arm. This flow submits v9 transactions only, so a v8
//    record means the provider is pointed at the wrong network.
if (record.version !== 'v9') {
  throw new EraInvariantViolationError('watchForTxData', options.circuitId);
}

// 4. Check status
if (record.status !== SucceedEntirely) {
  throw new CallTxFailedError(record, options.circuitId);
}

// 5. Update private state manually if needed
if (options.privateStateId) {
  await providers.privateStateProvider.set(
    privateStateId,
    callTxData.private.nextPrivateState
  );
}
```

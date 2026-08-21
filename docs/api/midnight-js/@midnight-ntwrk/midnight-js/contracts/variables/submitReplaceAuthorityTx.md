[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitReplaceAuthorityTx

# Variable: submitReplaceAuthorityTx

> `const` **submitReplaceAuthorityTx**: \<`C`\>(`providers`, `compiledContract`, `contractAddress`) => (`newAuthority`) => `Promise`\<[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)\>

Defined in: packages/contracts/dist/index.d.ts:1224

Constructs and submits a transaction that replaces the maintenance
authority stored on the blockchain for this contract. After the transaction is
finalized, the current signing key stored in the given private state provider
is overwritten with the given new authority key.

## Transaction Execution Phases

Midnight transactions execute in two phases:
1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success

## Failure Behavior

**Guaranteed Phase Failure:**
- Transaction is rejected and not included in the blockchain
- `ReplaceMaintenanceAuthorityTxFailedError` is thrown with transaction data
- Signing key in private state provider is NOT updated (remains as current authority)
- Contract authority on-chain remains unchanged

**Fallible Phase Failure:**
- Transaction is recorded on-chain with non-`SucceedEntirely` status
- `ReplaceMaintenanceAuthorityTxFailedError` is thrown with transaction data
- Signing key in private state provider is NOT updated (remains as current authority)
- Contract authority on-chain may be partially updated but inconsistent
- Transaction appears in blockchain history as partial success

## Type Parameters

### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)

The providers to use to manage the transaction lifecycle.

### compiledContract

[`CompiledContract`](../../../midnight-js-protocol/compact-js/namespaces/CompiledContract/interfaces/CompiledContract.md)\<`C`, `any`\>

The compiled contract for which the maintenance authority
                        should be updated.

### contractAddress

[`ContractAddress`](../../../midnight-js-protocol/ledger/type-aliases/ContractAddress.md)

The address of the contract for which the maintenance
                       authority should be updated.

TODO: There are at least three options we should support in the future:
      1. Replace authority and maintain key (current).
      2. Replace authority and do not maintain key.
      3. Add additional authorities and maintain original key.

## Returns

(`newAuthority`) => `Promise`\<[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)\>

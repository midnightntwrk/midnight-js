[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitReplaceAuthorityTx

# Function: submitReplaceAuthorityTx()

## Call Signature

> **submitReplaceAuthorityTx**\<`C`\>(`providers`, `compiledContract`, `contractAddress`): (`newAuthority`) => `Promise`\<[`FinalizedMaintenanceTxData`](../namespaces/Ledger8/interfaces/FinalizedMaintenanceTxData.md)\>

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

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>\>

The providers to use to manage the transaction lifecycle.

#### compiledContract

`C`

The contract whose maintenance authority should be replaced.

#### contractAddress

`string`

The address of the contract for which the maintenance
                       authority should be updated.

### Returns

A function that takes the signing key of the new contract maintenance authority and
         resolves with the finalized transaction data under `public`, tagged with the pipeline's
         `era`, or rejects if an error occurs along the way.

(`newAuthority`) => `Promise`\<[`FinalizedMaintenanceTxData`](../namespaces/Ledger8/interfaces/FinalizedMaintenanceTxData.md)\>

### Throws

When transaction fails in either guaranteed or fallible phase.
        The error contains the finalized transaction data for debugging. The retained-era overload
        raises `Ledger8ReplaceMaintenanceAuthorityTxFailedError` instead, carrying the new key.

### Throws

When a retained-era artifact is used on a post-fork head.

### Throws

When the retained-era overload is given a new key that era
        cannot sign with. Raised before anything is composed.

### Throws

When the retained-era overload finds no usable current key.

### Throws

When the retained-era overload holds a key that is not
        the contract's maintenance authority. Raised before anything is proven.

### Throws

When a retained-era replacement was confirmed and the
        store then refused the new key. It carries the key.

### Throws

When a retained-era replacement was submitted but
        whether it landed could not be confirmed. It carries the new key, which was not stored.

TODO: There are at least three options we should support in the future:
      1. Replace authority and maintain key (current).
      2. Replace authority and do not maintain key.
      3. Add additional authorities and maintain original key.

## Call Signature

> **submitReplaceAuthorityTx**\<`C`\>(`providers`, `compiledContract`, `contractAddress`): (`newAuthority`) => `Promise`\<[`FinalizedMaintenanceTxData`](../interfaces/FinalizedMaintenanceTxData.md)\>

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

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)

The providers to use to manage the transaction lifecycle.

#### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract whose maintenance authority should be replaced.

#### contractAddress

`string`

The address of the contract for which the maintenance
                       authority should be updated.

### Returns

A function that takes the signing key of the new contract maintenance authority and
         resolves with the finalized transaction data under `public`, tagged with the pipeline's
         `era`, or rejects if an error occurs along the way.

(`newAuthority`) => `Promise`\<[`FinalizedMaintenanceTxData`](../interfaces/FinalizedMaintenanceTxData.md)\>

### Throws

When transaction fails in either guaranteed or fallible phase.
        The error contains the finalized transaction data for debugging. The retained-era overload
        raises `Ledger8ReplaceMaintenanceAuthorityTxFailedError` instead, carrying the new key.

### Throws

When a retained-era artifact is used on a post-fork head.

### Throws

When the retained-era overload is given a new key that era
        cannot sign with. Raised before anything is composed.

### Throws

When the retained-era overload finds no usable current key.

### Throws

When the retained-era overload holds a key that is not
        the contract's maintenance authority. Raised before anything is proven.

### Throws

When a retained-era replacement was confirmed and the
        store then refused the new key. It carries the key.

### Throws

When a retained-era replacement was submitted but
        whether it landed could not be confirmed. It carries the new key, which was not stored.

TODO: There are at least three options we should support in the future:
      1. Replace authority and maintain key (current).
      2. Replace authority and do not maintain key.
      3. Add additional authorities and maintain original key.

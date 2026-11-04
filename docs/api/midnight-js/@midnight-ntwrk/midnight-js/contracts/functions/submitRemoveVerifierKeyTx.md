[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitRemoveVerifierKeyTx

# Function: submitRemoveVerifierKeyTx()

## Call Signature

> **submitRemoveVerifierKeyTx**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `circuitId`): `Promise`\<[`Ledger8FinalizedMaintenanceTxData`](../interfaces/Ledger8FinalizedMaintenanceTxData.md)\>

Constructs and submits a transaction that removes the current verifier key stored
on the blockchain for the given circuit ID at the given contract address.

## Transaction Execution Phases

Midnight transactions execute in two phases:
1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success

## Failure Behavior

**Guaranteed Phase Failure:**
- Transaction is rejected and not included in the blockchain
- `TxFailedError` is thrown with transaction data
- Verifier key remains on the contract (unchanged)
- No on-chain record of the failed transaction

**Fallible Phase Failure:**
- Transaction is recorded on-chain with non-`SucceedEntirely` status
- `TxFailedError` is thrown with transaction data
- Verifier key may be partially removed but contract state is inconsistent
- Transaction appears in blockchain history as partial success

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

The providers to use to manage the transaction lifecycle.

#### compiledContract

`C`

The contract the circuit belongs to.

#### contractAddress

`string`

The address of the contract containing the circuit for which
                       the verifier key should be removed.

#### circuitId

[`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>

The circuit for which the verifier key should be removed.

### Returns

`Promise`\<[`Ledger8FinalizedMaintenanceTxData`](../interfaces/Ledger8FinalizedMaintenanceTxData.md)\>

A promise that resolves with the finalized transaction data under `public`, tagged
         with the pipeline's `era`, or rejects if an error occurs along the way.

### Throws

When transaction fails in either guaranteed or fallible phase.
        The error contains the finalized transaction data for debugging. Raised by both eras;
        `record.era` tells which.

### Throws

with reason `'ledger8-maintenance-on-ledger9-network'` When a retained-era artifact is used after the fork.

### Throws

with reason `'unavailable'` When the retained-era overload finds no usable key.

### Throws

When the retained-era overload holds a key that is not
        the contract's maintenance authority. Raised before anything is proven.

### Throws

When the contract state, or the retained-era artifact, declares no
        such circuit. Raised before anything is composed.

### Throws

When the circuit's verifier key slot holds no key. Raised before
        anything is composed.

TODO: We'll likely want to modify ZKConfigProvider provider so that the verifier keys are
      automatically rotated in this function. This likely involves storing key versions
      along with keys in ZKConfigProvider. By default, artifacts for the latest version
      would be fetched to build transactions.

## Call Signature

> **submitRemoveVerifierKeyTx**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `circuitId`): `Promise`\<[`Ledger9FinalizedMaintenanceTxData`](../interfaces/Ledger9FinalizedMaintenanceTxData.md)\>

Constructs and submits a transaction that removes the current verifier key stored
on the blockchain for the given circuit ID at the given contract address.

## Transaction Execution Phases

Midnight transactions execute in two phases:
1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success

## Failure Behavior

**Guaranteed Phase Failure:**
- Transaction is rejected and not included in the blockchain
- `TxFailedError` is thrown with transaction data
- Verifier key remains on the contract (unchanged)
- No on-chain record of the failed transaction

**Fallible Phase Failure:**
- Transaction is recorded on-chain with non-`SucceedEntirely` status
- `TxFailedError` is thrown with transaction data
- Verifier key may be partially removed but contract state is inconsistent
- Transaction appears in blockchain history as partial success

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)

The providers to use to manage the transaction lifecycle.

#### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract the circuit belongs to.

#### contractAddress

`string`

The address of the contract containing the circuit for which
                       the verifier key should be removed.

#### circuitId

[`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The circuit for which the verifier key should be removed.

### Returns

`Promise`\<[`Ledger9FinalizedMaintenanceTxData`](../interfaces/Ledger9FinalizedMaintenanceTxData.md)\>

A promise that resolves with the finalized transaction data under `public`, tagged
         with the pipeline's `era`, or rejects if an error occurs along the way.

### Throws

When transaction fails in either guaranteed or fallible phase.
        The error contains the finalized transaction data for debugging. Raised by both eras;
        `record.era` tells which.

### Throws

with reason `'ledger8-maintenance-on-ledger9-network'` When a retained-era artifact is used after the fork.

### Throws

with reason `'unavailable'` When the retained-era overload finds no usable key.

### Throws

When the retained-era overload holds a key that is not
        the contract's maintenance authority. Raised before anything is proven.

### Throws

When the contract state, or the retained-era artifact, declares no
        such circuit. Raised before anything is composed.

### Throws

When the circuit's verifier key slot holds no key. Raised before
        anything is composed.

TODO: We'll likely want to modify ZKConfigProvider provider so that the verifier keys are
      automatically rotated in this function. This likely involves storing key versions
      along with keys in ZKConfigProvider. By default, artifacts for the latest version
      would be fetched to build transactions.

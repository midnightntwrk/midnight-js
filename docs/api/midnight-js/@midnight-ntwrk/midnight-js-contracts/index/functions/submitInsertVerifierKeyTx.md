[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / submitInsertVerifierKeyTx

# Function: submitInsertVerifierKeyTx()

## Call Signature

> **submitInsertVerifierKeyTx**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `circuitId`, `newVk`): `Promise`\<[`Ledger8FinalizedMaintenanceTxData`](../interfaces/Ledger8FinalizedMaintenanceTxData.md)\>

Constructs and submits a transaction that adds a new verifier key to the
blockchain for the given circuit ID at the given contract address.

## Transaction Execution Phases

Midnight transactions execute in two phases:
1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success

## Failure Behavior

**Guaranteed Phase Failure:**
- Transaction is rejected and not included in the blockchain
- `InsertVerifierKeyTxFailedError` is thrown with transaction data
- Verifier key is NOT added to the contract
- No on-chain record of the failed transaction

**Fallible Phase Failure:**
- Transaction is recorded on-chain with non-`SucceedEntirely` status
- `InsertVerifierKeyTxFailedError` is thrown with transaction data
- Verifier key may be partially added but not usable
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
                       the verifier key should be inserted.

#### circuitId

[`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>

The circuit for which the verifier key should be inserted.

#### newVk

[`VerifierKey`](../../../midnight-js/types/type-aliases/VerifierKey.md)

The new verifier key for the circuit.

### Returns

`Promise`\<[`Ledger8FinalizedMaintenanceTxData`](../interfaces/Ledger8FinalizedMaintenanceTxData.md)\>

A promise that resolves with the finalized transaction data under `public`, tagged
         with the pipeline's `era`, or rejects if an error occurs along the way.

### Throws

When transaction fails in either guaranteed or fallible phase.
        The error contains the finalized transaction data for debugging. The retained-era overload
        raises `Ledger8InsertVerifierKeyTxFailedError` instead.

### Throws

When a retained-era artifact is used after the fork.

### Throws

When the retained-era overload finds no usable key.

### Throws

When the retained-era overload holds a key that is not
        the contract's maintenance authority. Raised before anything is proven.

### Throws

When the circuit's verifier key slot already holds a key, or the
        retained-era artifact declares no such circuit. Raised before anything is composed.

TODO: We'll likely want to modify ZKConfigProvider provider so that the verifier keys are
      automatically rotated in this function. This likely involves storing key versions
      along with keys in ZKConfigProvider. By default, artifacts for the latest version
      would be fetched to build transactions.

## Call Signature

> **submitInsertVerifierKeyTx**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `circuitId`, `newVk`): `Promise`\<[`Ledger9FinalizedMaintenanceTxData`](../interfaces/Ledger9FinalizedMaintenanceTxData.md)\>

Constructs and submits a transaction that adds a new verifier key to the
blockchain for the given circuit ID at the given contract address.

## Transaction Execution Phases

Midnight transactions execute in two phases:
1. **Guaranteed phase**: If failure occurs, the transaction is NOT included in the blockchain
2. **Fallible phase**: If failure occurs, the transaction IS recorded on-chain as a partial success

## Failure Behavior

**Guaranteed Phase Failure:**
- Transaction is rejected and not included in the blockchain
- `InsertVerifierKeyTxFailedError` is thrown with transaction data
- Verifier key is NOT added to the contract
- No on-chain record of the failed transaction

**Fallible Phase Failure:**
- Transaction is recorded on-chain with non-`SucceedEntirely` status
- `InsertVerifierKeyTxFailedError` is thrown with transaction data
- Verifier key may be partially added but not usable
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
                       the verifier key should be inserted.

#### circuitId

[`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The circuit for which the verifier key should be inserted.

#### newVk

[`VerifierKey`](../../../midnight-js/types/type-aliases/VerifierKey.md)

The new verifier key for the circuit.

### Returns

`Promise`\<[`Ledger9FinalizedMaintenanceTxData`](../interfaces/Ledger9FinalizedMaintenanceTxData.md)\>

A promise that resolves with the finalized transaction data under `public`, tagged
         with the pipeline's `era`, or rejects if an error occurs along the way.

### Throws

When transaction fails in either guaranteed or fallible phase.
        The error contains the finalized transaction data for debugging. The retained-era overload
        raises `Ledger8InsertVerifierKeyTxFailedError` instead.

### Throws

When a retained-era artifact is used after the fork.

### Throws

When the retained-era overload finds no usable key.

### Throws

When the retained-era overload holds a key that is not
        the contract's maintenance authority. Raised before anything is proven.

### Throws

When the circuit's verifier key slot already holds a key, or the
        retained-era artifact declares no such circuit. Raised before anything is composed.

TODO: We'll likely want to modify ZKConfigProvider provider so that the verifier keys are
      automatically rotated in this function. This likely involves storing key versions
      along with keys in ZKConfigProvider. By default, artifacts for the latest version
      would be fetched to build transactions.

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / WellFormedStrictness

# Class: WellFormedStrictness

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1290

Strictness criteria for evaluating transaction well-formedness, used for
disabling parts of transaction validation for testing.

## Constructors

### Constructor

> **new WellFormedStrictness**(): `WellFormedStrictness`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1291

#### Returns

`WellFormedStrictness`

## Properties

### enforceBalancing

> **enforceBalancing**: `boolean`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1296

Whether to require the transaction to have a non-negative balance

***

### enforceLimits

> **enforceLimits**: `boolean`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1308

Whether to enforce the transaction byte limit

***

### verifyContractProofs

> **verifyContractProofs**: `boolean`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1304

Whether to validate contract proofs in the transaction

***

### verifyNativeProofs

> **verifyNativeProofs**: `boolean`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1300

Whether to validate Midnight-native (non-contract) proofs in the transaction

***

### verifySignatures

> **verifySignatures**: `boolean`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1312

Whether to enforce the signature verification

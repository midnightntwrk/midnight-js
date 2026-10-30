[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / submitDeployTx

# Function: submitDeployTx()

Creates and submits a deploy transaction for a contract of the era its artifacts declare. A
ledger 9 contract runs [submitLedger9DeployTx](submitLedger9DeployTx.md).

## Throws

EraMismatchError with reason `'ledger8-contract-unsupported'` for a contract produced by
        the ledger 8 Compact toolchain, after the artifact era is read and before anything else.
        `deployContract` deploys contracts of both eras.

## Call Signature

> **submitDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9FinalizedDeployTxData`](../interfaces/Ledger9FinalizedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`Ledger9DeployTxOptionsBase`](../type-aliases/Ledger9DeployTxOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9FinalizedDeployTxData`](../interfaces/Ledger9FinalizedDeployTxData.md)\<`C`\>\>

## Call Signature

> **submitDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9FinalizedDeployTxData`](../interfaces/Ledger9FinalizedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`\>

#### options

[`Ledger9DeployTxOptionsWithPrivateStateId`](../type-aliases/Ledger9DeployTxOptionsWithPrivateStateId.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9FinalizedDeployTxData`](../interfaces/Ledger9FinalizedDeployTxData.md)\<`C`\>\>

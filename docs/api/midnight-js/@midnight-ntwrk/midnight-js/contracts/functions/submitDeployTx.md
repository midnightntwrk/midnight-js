[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / submitDeployTx

# Function: submitDeployTx()

## Call Signature

> **submitDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9FinalizedDeployTxData`](../interfaces/Ledger9FinalizedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`DeployTxOptionsBase`](../type-aliases/DeployTxOptionsBase.md)\<`C`\>

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

[`DeployTxOptionsWithPrivateStateId`](../type-aliases/DeployTxOptionsWithPrivateStateId.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9FinalizedDeployTxData`](../interfaces/Ledger9FinalizedDeployTxData.md)\<`C`\>\>

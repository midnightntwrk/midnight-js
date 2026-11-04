[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / submitDeployTx

# Function: submitDeployTx()

Creates and submits a deploy transaction for a contract of the era its artifacts declare. A
ledger 9 contract runs [submitLedger9DeployTx](submitLedger9DeployTx.md), a ledger 8 contract [submitLedger8DeployTx](submitLedger8DeployTx.md);
their documentation covers the parameters and the privacy-sensitive result.

## Throws

IncompleteDeployContractPrivateStateConfig If `privateStateId` and `initialPrivateState`
        are not given together. Raised before any provider is touched.

## Throws

InvalidArgumentError If `privateStateId` is given as `undefined` or `null`. Raised before
        any provider is touched.

## Throws

EraMismatchError with the reasons of the artifact era read: `'unwrapped-ledger9-contract'`,
        `'unrecognised-contract-shape'`, `'artifact-era-undeclared'`, `'provider-cannot-declare-era'`,
        `'unknown-artifact-runtime-version'`, `'ledger8-artifacts-in-ledger9-container'`. A failure of the
        ZK config provider propagates unchanged.

## Call Signature

> **submitDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger8FinalizedDeployTxData`](../interfaces/Ledger8FinalizedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

#### options

[`Ledger8DeployContractOptions`](../type-aliases/Ledger8DeployContractOptions.md)\<`C`\>

### Returns

`Promise`\<[`Ledger8FinalizedDeployTxData`](../interfaces/Ledger8FinalizedDeployTxData.md)\<`C`\>\>

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

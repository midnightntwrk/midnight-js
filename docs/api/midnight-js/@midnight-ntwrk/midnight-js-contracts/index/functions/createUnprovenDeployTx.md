[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createUnprovenDeployTx

# Function: createUnprovenDeployTx()

Creates an unproven deploy transaction for a contract of the era its artifacts declare. A ledger 9
contract runs [createLedger9UnprovenDeployTx](createLedger9UnprovenDeployTx.md), a ledger 8 contract [createLedger8UnprovenDeployTx](createLedger8UnprovenDeployTx.md);
their documentation covers the parameters and the privacy-sensitive result.

## Throws

InvalidArgumentError for a ledger 8 contract given without `publicDataProvider`,
        `proofProvider` or `midnightProvider`, before the network is read.

## Throws

EraMismatchError with the reasons of the artifact era read: `'unwrapped-ledger9-contract'`,
        `'unrecognised-contract-shape'`, `'artifact-era-undeclared'`, `'provider-cannot-declare-era'`,
        `'unknown-artifact-runtime-version'`, `'ledger8-artifacts-in-ledger9-container'`. A failure of the
        ZK config provider propagates unchanged.

## Call Signature

> **createUnprovenDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger8UnsubmittedDeployTxData`](../interfaces/Ledger8UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

#### options

[`Ledger8UnprovenDeployTxOptions`](../type-aliases/Ledger8UnprovenDeployTxOptions.md)\<`C`\>

### Returns

`Promise`\<[`Ledger8UnsubmittedDeployTxData`](../interfaces/Ledger8UnsubmittedDeployTxData.md)\<`C`\>\>

## Call Signature

> **createUnprovenDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`Ledger9UnprovenDeployTxProviders`](../type-aliases/Ledger9UnprovenDeployTxProviders.md)\<`C`\>

#### options

[`Ledger9DeployTxOptionsBase`](../type-aliases/Ledger9DeployTxOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

## Call Signature

> **createUnprovenDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`Ledger9UnprovenDeployTxProviders`](../type-aliases/Ledger9UnprovenDeployTxProviders.md)\<`C`\>

#### options

[`Ledger9DeployTxOptionsWithPrivateState`](../type-aliases/Ledger9DeployTxOptionsWithPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createUnprovenDeployTx

# Function: createUnprovenDeployTx()

Creates an unproven deploy transaction for a contract of the era its artifacts declare. A ledger 9
contract runs [createLedger9UnprovenDeployTx](createLedger9UnprovenDeployTx.md), whose documentation covers
the parameters and the privacy-sensitive result.

## Throws

EraMismatchError with reason `'contract-era-unsupported'` for a contract of an era this
        function does not serve, after the artifact era is read and before anything else, and with
        the reasons of the artifact era read: `'unwrapped-ledger9-contract'`,
        `'unrecognised-contract-shape'`, `'artifact-era-undeclared'`, `'provider-cannot-declare-era'`,
        `'unknown-artifact-runtime-version'`. A failure of the ZK config provider propagates unchanged.

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

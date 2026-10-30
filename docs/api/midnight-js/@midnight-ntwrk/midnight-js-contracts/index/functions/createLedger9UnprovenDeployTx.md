[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createLedger9UnprovenDeployTx

# Function: createLedger9UnprovenDeployTx()

Calls a contract constructor and creates an unbalanced, unproven, unsubmitted, deploy transaction
from the constructor results.

## Param

**providers**

The providers to use to create the deploy transaction.

## Param

**options**

Configuration.

## Throws

ConfigurationError If `providers.config` is missing.

## Throws

InvalidArgumentError If its `networkId` is not a non-empty string without surrounding
        whitespace.

## Throws

InvalidArgumentError If `providers.config.ttlSeconds` is not a positive whole number, or overflows a `Date`.

## Remarks

The returned [Ledger9UnsubmittedDeployTxData](../interfaces/Ledger9UnsubmittedDeployTxData.md) is privacy-sensitive and
carries the unproven transaction, signing key, initial private state, and
initial Zswap state. See that type for handling guidance before logging,
serializing, or transmitting the result.

## Call Signature

> **createLedger9UnprovenDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

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

> **createLedger9UnprovenDeployTx**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9UnsubmittedDeployTxData`](../interfaces/Ledger9UnsubmittedDeployTxData.md)\<`C`\>\>

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

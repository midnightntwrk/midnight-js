[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createUnprovenDeployTxFromVerifierKeys

# Function: createUnprovenDeployTxFromVerifierKeys()

Calls a contract constructor and creates an unbalanced, unproven, unsubmitted, deploy transaction
from the constructor results.

## Param

**zkConfigProvider**

Supplies the verifier keys for the contract being deployed.

## Param

**coinPublicKey**

The Zswap coin public key of the current user.

## Param

**options**

Configuration.

## Param

**encryptionPublicKey**

The Zswap encryption public key of the current user.

## Param

**config**

The network the transaction is built for and how long it stays valid, normally `providers.config`.

## Throws

ConfigurationError If `config` is missing.

## Throws

InvalidArgumentError If its `networkId` is not a non-empty string without surrounding
        whitespace.

## Throws

InvalidArgumentError If `config.ttlSeconds` is not a positive whole number, or overflows a `Date`.

## Remarks

The returned [UnsubmittedDeployTxData](../interfaces/UnsubmittedDeployTxData.md) is privacy-sensitive and
carries the unproven transaction, signing key, initial private state, and
initial Zswap state. See that type for handling guidance before logging,
serializing, or transmitting the result.

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`, `config`): `Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`DeployTxOptionsBase`](../type-aliases/DeployTxOptionsBase.md)\<`C`\>

#### encryptionPublicKey

`string`

#### config

[`MidnightConfig`](../../../midnight-js/types/interfaces/MidnightConfig.md)

### Returns

`Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`, `config`): `Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`DeployTxOptionsWithPrivateState`](../type-aliases/DeployTxOptionsWithPrivateState.md)\<`C`\>

#### encryptionPublicKey

`string`

#### config

[`MidnightConfig`](../../../midnight-js/types/interfaces/MidnightConfig.md)

### Returns

`Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

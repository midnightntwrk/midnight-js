[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / createUnprovenDeployTxFromVerifierKeys

# Function: createUnprovenDeployTxFromVerifierKeys()

Calls a contract constructor and creates an unbalanced, unproven, unsubmitted, deploy transaction
from the constructor results.

## Param

**verifierKeys**

The verifier keys for the contract being deployed.

## Param

**coinPublicKey**

The Zswap coin public key of the current user.

## Param

**options**

Configuration.

## Param

**encryptionPublicKey**

## Remarks

The returned [UnsubmittedDeployTxData](../interfaces/UnsubmittedDeployTxData.md) is privacy-sensitive and
carries the unproven transaction, signing key, initial private state, and
initial Zswap state. See that type for handling guidance before logging,
serializing, or transmitting the result.

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`): `Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Contract`](../../midnight-js-protocol/compact-js/interfaces/Contract.md)\<`undefined`, [`Witnesses`](../../midnight-js-protocol/compact-js/type-aliases/Witnesses.md)\<`undefined`\>\>

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`DeployTxOptionsBase`](../type-aliases/DeployTxOptionsBase.md)\<`C`\>

#### encryptionPublicKey

`string`

### Returns

`Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

## Call Signature

> **createUnprovenDeployTxFromVerifierKeys**\<`C`\>(`zkConfigProvider`, `coinPublicKey`, `options`, `encryptionPublicKey`): `Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

### Type Parameters

#### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### Parameters

#### zkConfigProvider

[`ZKConfigProvider`](../../midnight-js/types/classes/ZKConfigProvider.md)\<`string`\>

#### coinPublicKey

`string`

#### options

[`DeployTxOptionsWithPrivateState`](../type-aliases/DeployTxOptionsWithPrivateState.md)\<`C`\>

#### encryptionPublicKey

`string`

### Returns

`Promise`\<[`UnsubmittedDeployTxData`](../interfaces/UnsubmittedDeployTxData.md)\<`C`\>\>

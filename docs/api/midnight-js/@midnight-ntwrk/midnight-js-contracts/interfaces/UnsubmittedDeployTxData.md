[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / UnsubmittedDeployTxData

# Interface: UnsubmittedDeployTxData\<C\>

Base type for data relevant to an unsubmitted deployment transaction.

## Remarks

**Privacy-sensitive type.** Transitively contains
[UnsubmittedDeployTxPrivateData](UnsubmittedDeployTxPrivateData.md) via the `private` field (signing key
and initial private state). When logging, serializing, or transmitting,
read only the `public` field or destructure specific non-sensitive fields
— never spread or stringify the whole object.

## Extends

- [`UnsubmittedDeployTxDataBase`](UnsubmittedDeployTxDataBase.md)\<`C`\>

## Extended by

- [`FinalizedDeployTxData`](FinalizedDeployTxData.md)

## Type Parameters

### C

`C` *extends* `Contract.Any`

## Properties

### private

> `readonly` **private**: [`UnsubmittedDeployTxPrivateDataFull`](UnsubmittedDeployTxPrivateDataFull.md)\<`C`\>

The data of this transaction that is only visible on the user device.

#### Overrides

[`UnsubmittedDeployTxDataBase`](UnsubmittedDeployTxDataBase.md).[`private`](UnsubmittedDeployTxDataBase.md#private)

***

### public

> `readonly` **public**: [`UnsubmittedDeployTxPublicData`](UnsubmittedDeployTxPublicData.md)

The public data (data that will be revealed upon tx submission) relevant to the deployment transaction.

#### Inherited from

[`UnsubmittedDeployTxDataBase`](UnsubmittedDeployTxDataBase.md).[`public`](UnsubmittedDeployTxDataBase.md#public)

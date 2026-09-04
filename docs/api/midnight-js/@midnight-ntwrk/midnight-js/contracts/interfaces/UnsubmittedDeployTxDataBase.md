[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / UnsubmittedDeployTxDataBase

# Interface: UnsubmittedDeployTxDataBase\<C\>

Defined in: packages/contracts/dist/index.d.ts:521

Base type for data relevant to an unsubmitted deployment transaction.

## Remarks

**Privacy-sensitive type.** Transitively contains
[UnsubmittedDeployTxPrivateData](UnsubmittedDeployTxPrivateData.md) via the `private` field (signing key
and initial private state). When logging, serializing, or transmitting,
read only the `public` field or destructure specific non-sensitive fields
— never spread or stringify the whole object.

## Extended by

- [`FinalizedDeployTxDataBase`](FinalizedDeployTxDataBase.md)
- [`UnsubmittedDeployTxData`](UnsubmittedDeployTxData.md)

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### private

> `readonly` **private**: [`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:529

The private data (data that will not be revealed upon tx submission) relevant to the deployment transaction.

***

### public

> `readonly` **public**: [`UnsubmittedDeployTxPublicData`](UnsubmittedDeployTxPublicData.md)

Defined in: packages/contracts/dist/index.d.ts:525

The public data (data that will be revealed upon tx submission) relevant to the deployment transaction.

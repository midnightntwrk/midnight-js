[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FinalizedDeployTxDataBase

# Interface: FinalizedDeployTxDataBase\<C\>

Defined in: packages/contracts/dist/index.d.ts:578

Base type for data relevant to an unsubmitted deployment transaction.

## Remarks

**Privacy-sensitive type.** Transitively contains
[UnsubmittedDeployTxPrivateData](UnsubmittedDeployTxPrivateData.md) via the `private` field (signing key
and initial private state). When logging, serializing, or transmitting,
read only the `public` field or destructure specific non-sensitive fields
— never spread or stringify the whole object.

## Extends

- [`UnsubmittedDeployTxDataBase`](UnsubmittedDeployTxDataBase.md)\<`C`\>

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### private

> `readonly` **private**: [`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:529

The private data (data that will not be revealed upon tx submission) relevant to the deployment transaction.

#### Inherited from

[`UnsubmittedDeployTxDataBase`](UnsubmittedDeployTxDataBase.md).[`private`](UnsubmittedDeployTxDataBase.md#private)

***

### public

> `readonly` **public**: [`FinalizedDeployTxPublicData`](FinalizedDeployTxPublicData.md)

Defined in: packages/contracts/dist/index.d.ts:582

The data of this transaction that is visible on the blockchain.

#### Overrides

[`UnsubmittedDeployTxDataBase`](UnsubmittedDeployTxDataBase.md).[`public`](UnsubmittedDeployTxDataBase.md#public)

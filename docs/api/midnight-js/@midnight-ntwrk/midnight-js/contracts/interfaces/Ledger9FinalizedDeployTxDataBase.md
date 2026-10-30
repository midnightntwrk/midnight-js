[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9FinalizedDeployTxDataBase

# Interface: Ledger9FinalizedDeployTxDataBase\<C\>

Base type for data relevant to an unsubmitted deployment transaction.

## Remarks

**Privacy-sensitive type.** Transitively contains
[Ledger9UnsubmittedDeployTxPrivateData](Ledger9UnsubmittedDeployTxPrivateData.md) via the `private` field (signing key
and initial private state). When logging, serializing, or transmitting,
read only the `public` field or destructure specific non-sensitive fields
— never spread or stringify the whole object.

## Extends

- [`Ledger9UnsubmittedDeployTxDataBase`](Ledger9UnsubmittedDeployTxDataBase.md)\<`C`\>

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### era

> `readonly` **era**: `"v9"`

The pipeline that produced this result: always ledger 9 here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

#### Inherited from

[`Ledger9UnsubmittedDeployTxDataBase`](Ledger9UnsubmittedDeployTxDataBase.md).[`era`](Ledger9UnsubmittedDeployTxDataBase.md#era)

***

### private

> `readonly` **private**: [`Ledger9UnsubmittedDeployTxPrivateData`](Ledger9UnsubmittedDeployTxPrivateData.md)\<`C`\>

The private data (data that will not be revealed upon tx submission) relevant to the deployment transaction.

#### Inherited from

[`Ledger9UnsubmittedDeployTxDataBase`](Ledger9UnsubmittedDeployTxDataBase.md).[`private`](Ledger9UnsubmittedDeployTxDataBase.md#private)

***

### public

> `readonly` **public**: [`Ledger9FinalizedDeployTxPublicData`](Ledger9FinalizedDeployTxPublicData.md)

The data of this transaction that is visible on the blockchain.

#### Overrides

[`Ledger9UnsubmittedDeployTxDataBase`](Ledger9UnsubmittedDeployTxDataBase.md).[`public`](Ledger9UnsubmittedDeployTxDataBase.md#public)

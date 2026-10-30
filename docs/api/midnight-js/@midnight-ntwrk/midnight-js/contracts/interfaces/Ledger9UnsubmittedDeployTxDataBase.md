[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9UnsubmittedDeployTxDataBase

# Interface: Ledger9UnsubmittedDeployTxDataBase\<C\>

Base type for data relevant to an unsubmitted deployment transaction.

## Remarks

**Privacy-sensitive type.** Transitively contains
[Ledger9UnsubmittedDeployTxPrivateData](Ledger9UnsubmittedDeployTxPrivateData.md) via the `private` field (signing key
and initial private state). When logging, serializing, or transmitting,
read only the `public` field or destructure specific non-sensitive fields
— never spread or stringify the whole object.

## Extended by

- [`Ledger9FinalizedDeployTxDataBase`](Ledger9FinalizedDeployTxDataBase.md)
- [`Ledger9UnsubmittedDeployTxData`](Ledger9UnsubmittedDeployTxData.md)

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

***

### private

> `readonly` **private**: [`Ledger9UnsubmittedDeployTxPrivateData`](Ledger9UnsubmittedDeployTxPrivateData.md)\<`C`\>

The private data (data that will not be revealed upon tx submission) relevant to the deployment transaction.

***

### public

> `readonly` **public**: [`Ledger9UnsubmittedDeployTxPublicData`](Ledger9UnsubmittedDeployTxPublicData.md)

The public data (data that will be revealed upon tx submission) relevant to the deployment transaction.

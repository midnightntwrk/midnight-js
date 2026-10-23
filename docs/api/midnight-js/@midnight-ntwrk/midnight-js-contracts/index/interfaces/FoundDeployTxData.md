[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / FoundDeployTxData

# Interface: FoundDeployTxData\<C\>

Data for a deployment found on chain by `findDeployedContract`.

## Remarks

**Privacy-sensitive type.** The `private` field carries the signing key and
the initial private state. When logging, serializing, or transmitting, read
only the `public` field or destructure specific non-sensitive fields.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### era

> `readonly` **era**: `"ledger9"`

The pipeline this handle runs on: always the current era here. The era that
recorded the deploy transaction is `public.version`.

***

### private

> `readonly` **private**: [`UnsubmittedDeployTxPrivateData`](UnsubmittedDeployTxPrivateData.md)\<`C`\>

The private data stored for this contract on this device.

***

### public

> `readonly` **public**: [`FoundDeployTxPublicData`](../type-aliases/FoundDeployTxPublicData.md)

The data of the deploy transaction that is visible on the blockchain.

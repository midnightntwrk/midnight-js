[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / FinalizedDeployTxData

# Interface: FinalizedDeployTxData\<C\>

Data for a finalized deploy transaction submitted in this process.

## Remarks

**Privacy-sensitive type.** Inherits [UnsubmittedDeployTxData](UnsubmittedDeployTxData.md)'s
`private` field, which transitively carries the `UnprovenTransaction`,
`newCoins`, signing key, initial private state, and `initialZswapState`.
Treat as confidential when logging, serializing, or transmitting —
destructure only the non-sensitive fields (`public.txId`,
`public.blockHeight`, etc.) rather than spreading or stringifying the whole
object.

The framework deliberately exposes these references to support retry,
replay, debug, and redacted-telemetry workflows — raw transmission to
observability platforms (log shippers, error reporters, analytics) is
not an intended use.

## Extends

- [`UnsubmittedDeployTxData`](UnsubmittedDeployTxData.md)\<`C`\>

## Type Parameters

### C

`C` *extends* `Contract.Any`

## Properties

### private

> `readonly` **private**: [`UnsubmittedDeployTxPrivateDataFull`](UnsubmittedDeployTxPrivateDataFull.md)\<`C`\>

The data of this transaction that is only visible on the user device.

#### Inherited from

[`UnsubmittedDeployTxData`](UnsubmittedDeployTxData.md).[`private`](UnsubmittedDeployTxData.md#private)

***

### public

> `readonly` **public**: [`FinalizedDeployTxPublicData`](FinalizedDeployTxPublicData.md)

The data of this transaction that is visible on the blockchain.

#### Overrides

[`UnsubmittedDeployTxData`](UnsubmittedDeployTxData.md).[`public`](UnsubmittedDeployTxData.md#public)

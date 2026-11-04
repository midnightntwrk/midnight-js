[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9FinalizedDeployTxData

# Interface: Ledger9FinalizedDeployTxData\<C\>

Data for a finalized deploy transaction submitted in this process.

## Remarks

**Privacy-sensitive type.** Inherits [Ledger9UnsubmittedDeployTxData](Ledger9UnsubmittedDeployTxData.md)'s
`private` field, which transitively carries the unproven transaction,
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

- [`Ledger9UnsubmittedDeployTxData`](Ledger9UnsubmittedDeployTxData.md)\<`C`\>

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

> `readonly` **private**: [`Ledger9UnsubmittedDeployTxPrivateDataFull`](Ledger9UnsubmittedDeployTxPrivateDataFull.md)\<`C`\>

The data of this transaction that is only visible on the user device.

#### Inherited from

[`Ledger9UnsubmittedDeployTxData`](Ledger9UnsubmittedDeployTxData.md).[`private`](Ledger9UnsubmittedDeployTxData.md#private)

***

### public

> `readonly` **public**: [`Ledger9FinalizedDeployTxPublicData`](Ledger9FinalizedDeployTxPublicData.md)

The data of this transaction that is visible on the blockchain.

#### Overrides

[`Ledger9UnsubmittedDeployTxDataBase`](Ledger9UnsubmittedDeployTxDataBase.md).[`public`](Ledger9UnsubmittedDeployTxDataBase.md#public)

[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmitTxOptions

# Interface: SubmitTxOptions\<PCK\>

Configuration for [submitTx](../functions/submitTx.md).

## Type Parameters

### PCK

`PCK` *extends* [`AnyProvableCircuitId`](../../../midnight-js/types/type-aliases/AnyProvableCircuitId.md)

## Properties

### circuitId?

> `readonly` `optional` **circuitId?**: `PCK` \| `PCK`[]

A circuit identifier to use to fetch the ZK artifacts needed to prove the
transaction. Only defined if a call transaction is being submitted.

#### Remarks

Where a transaction involves multiple circuits (e.g., when circuit calls are scoped to a transaction
context), this may be an array of circuit IDs.

***

### unprovenTx

> `readonly` **unprovenTx**: [`VersionedUnprovenTransaction`](../../../midnight-js/types/type-aliases/VersionedUnprovenTransaction.md)

The transaction to prove, balance, and submit, tagged with the ledger era that wrote it:
`{ version: 'v9', tx }` for a live v9 transaction, `{ version: 'v8', txBytes }` for the
serialized bytes of a v8 one.

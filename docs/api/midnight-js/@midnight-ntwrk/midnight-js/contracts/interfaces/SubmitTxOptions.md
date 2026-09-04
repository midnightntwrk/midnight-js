[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / SubmitTxOptions

# Interface: SubmitTxOptions\<PCK\>

Defined in: packages/contracts/dist/index.d.ts:374

Configuration for [submitTx](../variables/submitTx.md).

## Type Parameters

### PCK

`PCK` *extends* [`AnyProvableCircuitId`](../../types/type-aliases/AnyProvableCircuitId.md)

## Properties

### circuitId?

> `readonly` `optional` **circuitId?**: `PCK` \| `PCK`[]

Defined in: packages/contracts/dist/index.d.ts:387

A circuit identifier to use to fetch the ZK artifacts needed to prove the
transaction. Only defined if a call transaction is being submitted.

#### Remarks

Where a transaction involves multiple circuits (e.g., when circuit calls are scoped to a transaction
context), this may be an array of circuit IDs.

***

### unprovenTx

> `readonly` **unprovenTx**: [`UnprovenTransaction`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:378

The transaction to prove, balance, and submit.

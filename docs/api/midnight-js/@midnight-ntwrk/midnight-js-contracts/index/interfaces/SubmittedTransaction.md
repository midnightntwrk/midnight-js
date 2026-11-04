[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / SubmittedTransaction

# Interface: SubmittedTransaction

A transaction submitted with `submitTx` or `submitTxAsync`: the caller built it, so neither the
contract nor, unless the caller named it, the circuit is known.

## Properties

### circuitId

> `readonly` **circuitId**: `string` \| `undefined`

The circuits the caller named on the submit options, joined by `', '`, or `undefined`.

***

### contractAddress?

> `readonly` `optional` **contractAddress?**: `undefined`

***

### kind

> `readonly` **kind**: `"transaction"`

***

### networkVersion

> `readonly` **networkVersion**: `"v9"` \| `"v8"`

The ledger version the network was on when `submitTx` read it.

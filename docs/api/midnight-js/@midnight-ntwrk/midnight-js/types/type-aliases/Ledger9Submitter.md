[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / Ledger9Submitter

# Type Alias: Ledger9Submitter

> **Ledger9Submitter** = (`tx`) => `Promise`\<[`TransactionId`](https://github.com/midnightntwrk/midnight-ledger)\>

Submits a ledger 9 transaction, which is passed to `submitTx` as a live ledger
object. It fills the `currentEra` slot while ledger 9 is the current era.

## Parameters

### tx

[`FinalizedTransaction$1`](https://github.com/midnightntwrk/midnight-ledger)

## Returns

`Promise`\<[`TransactionId`](https://github.com/midnightntwrk/midnight-ledger)\>

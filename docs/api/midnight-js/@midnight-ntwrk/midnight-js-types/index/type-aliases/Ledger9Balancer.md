[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / Ledger9Balancer

# Type Alias: Ledger9Balancer

> **Ledger9Balancer** = (`tx`, `ttl?`) => `Promise`\<[`FinalizedTransaction`](https://github.com/midnightntwrk/midnight-ledger)\>

Balances a ledger 9 transaction, which is passed to `balanceTx` as a live ledger
object. It fills the `currentEra` slot while ledger 9 is the current era.

## Parameters

### tx

[`UnboundTransaction`](UnboundTransaction.md)

### ttl?

`Date`

## Returns

`Promise`\<[`FinalizedTransaction`](https://github.com/midnightntwrk/midnight-ledger)\>

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / CurrentEraBalancer

# Type Alias: CurrentEraBalancer

> **CurrentEraBalancer** = (`tx`, `ttl?`) => `Promise`\<[`FinalizedTransaction$1`](https://github.com/midnightntwrk/midnight-ledger)\>

Balances a CURRENT-era transaction, which crosses this seam as a live ledger
object.

## Parameters

### tx

[`UnboundTransaction`](UnboundTransaction.md)

### ttl?

`Date`

## Returns

`Promise`\<[`FinalizedTransaction$1`](https://github.com/midnightntwrk/midnight-ledger)\>

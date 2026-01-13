[**Midnight.js API Reference v3.0.0-alpha.13**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ProveTxConfig

# Interface: ProveTxConfig\<K\>

The configuration for the proof request to the proof provider.

## Type Parameters

### K

`K` *extends* `string`

## Properties

### timeout?

> `readonly` `optional` **timeout**: `number`

The timeout for the request.

***

### zkConfig?

> `readonly` `optional` **zkConfig**: [`ZKConfig`](ZKConfig.md)\<`K`\> \| [`ZKConfig`](ZKConfig.md)\<`K`\>[]

The zero-knowledge configuration for the circuit that was called in the given transaction.
Undefined if the transaction is a deployment transaction.

#### Remarks

Where a transaction involves multiple circuits (e.g., when circuit calls are scoped to a transaction
context), this may be an array of [ZKConfig](ZKConfig.md).

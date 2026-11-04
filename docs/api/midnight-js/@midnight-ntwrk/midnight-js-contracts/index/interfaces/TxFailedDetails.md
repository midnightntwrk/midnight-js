[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / TxFailedDetails

# Interface: TxFailedDetails

What a failed transaction was about, beyond its record.

## Properties

### circuitId?

> `readonly` `optional` **circuitId?**: `string` \| readonly `string`[]

A call, or an insert or removal of a verifier key. A list when a scope made several calls.

***

### contractAddress?

> `readonly` `optional` **contractAddress?**: `string`

Set by a ledger 8 call, a deploy and the three maintenance operations. Not set by a ledger 9 call.

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

A deploy (the authority the contract was built with) or a replacement (the new authority).

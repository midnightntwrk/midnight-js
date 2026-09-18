[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ContractEntryPointPojo

# Interface: ContractEntryPointPojo

One entry point a contract state declares, with the verifier key registered
against it if there is one.

`verifierKey` and `verifierKeyHash` are both absent for a blank slot — the
shape a constructor-built state has before a deploy fills it in.

## See

[FailClosedDecoding](../../documents/FailClosedDecoding.md) for why they are absent rather than
zero-length or a hash of nothing.

## Properties

### circuitId

> `readonly` **circuitId**: `string`

***

### verifierKey

> `readonly` **verifierKey**: `Uint8Array`\<`ArrayBufferLike`\> \| `undefined`

***

### verifierKeyHash

> `readonly` **verifierKeyHash**: `string` \| `undefined`

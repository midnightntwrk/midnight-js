[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ComposeCallOptions

# Interface: ComposeCallOptions

Everything a call transaction needs.

`calls` is in execution-trace order: cross-contract callees first, the root
call last. A circuit with no cross-contract calls has a single entry.

The two Zswap offers are serialized offer bytes. `networkId` and `ttl` carry
the caller's policy decisions — which network, how long the transaction
lives.

## See

 - [ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md) for when the envelope options are checked.
 - [EraSeam](../../documents/EraSeam.md)

## Properties

### calls

> `readonly` **calls**: readonly [`ComposeCallEntry`](ComposeCallEntry.md)[]

***

### fallibleZswapOffer?

> `readonly` `optional` **fallibleZswapOffer?**: `Uint8Array`\<`ArrayBufferLike`\>

***

### guaranteedZswapOffer?

> `readonly` `optional` **guaranteedZswapOffer?**: `Uint8Array`\<`ArrayBufferLike`\>

***

### networkId

> `readonly` **networkId**: `string`

***

### ttl

> `readonly` **ttl**: `Date`

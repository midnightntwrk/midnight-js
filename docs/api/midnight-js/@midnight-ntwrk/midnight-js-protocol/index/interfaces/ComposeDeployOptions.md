[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ComposeDeployOptions

# Interface: ComposeDeployOptions

Everything a deploy transaction needs.

`contractState` is the raw, serialized initial state the contract's
constructor produced.

`verifierKeys` maps entry-point name -> raw, tagged verifier key bytes
(`keys/<id>.verifier`). When supplied, the map must name exactly the entry
points the state declares — no more, no fewer. Omit it only for a state that
ALREADY carries its keys.

## See

 - [VerifierKeys](../../documents/VerifierKeys.md)
 - [EraSeam](../../documents/EraSeam.md)

## Properties

### contractState

> `readonly` **contractState**: `Uint8Array`

***

### guaranteedZswapOffer?

> `readonly` `optional` **guaranteedZswapOffer?**: `Uint8Array`\<`ArrayBufferLike`\>

***

### networkId

> `readonly` **networkId**: `string`

***

### ttl

> `readonly` **ttl**: `Date`

***

### verifierKeys?

> `readonly` `optional` **verifierKeys?**: `ReadonlyMap`\<`string`, `Uint8Array`\<`ArrayBufferLike`\>\>

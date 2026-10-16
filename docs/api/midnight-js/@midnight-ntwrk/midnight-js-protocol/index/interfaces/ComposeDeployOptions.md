[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ComposeDeployOptions

# Interface: ComposeDeployOptions

Everything a deploy transaction needs.

`contractStateBytes` is the raw, serialized initial state the contract's
constructor produced.

`verifierKeys` maps entry-point name -> raw, tagged verifier key bytes
(`keys/<id>.verifier`). When supplied, the map must name exactly the entry
points the state declares — no more, no fewer. Omit it only for a state that
ALREADY carries its keys.

## See

 - [VerifierKeys](../../documents/VerifierKeys.md)
 - [EraSeam](../../documents/EraSeam.md)

## Properties

### contractStateBytes

> `readonly` **contractStateBytes**: `Uint8Array`

***

### guaranteedZswapOfferBytes?

> `readonly` `optional` **guaranteedZswapOfferBytes?**: `Uint8Array`\<`ArrayBufferLike`\>

***

### networkId

> `readonly` **networkId**: `string`

***

### ttl

> `readonly` **ttl**: `Date`

***

### verifierKeys?

> `readonly` `optional` **verifierKeys?**: `ReadonlyMap`\<`string`, `Uint8Array`\<`ArrayBufferLike`\>\>

[**Midnight.js API Reference v5.0.0-rc.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / TransactionDecoder

# Interface: TransactionDecoder

The `Transaction` class of a ledger copy, such as `Transaction` from `@midnightntwrk/ledger-v9`.
`deserialize` reads the bytes; `fromParts`, `prove` and `bind` give the types of the
transactions it decodes at each stage.

## Methods

### deserialize()

> **deserialize**(`markerS`, `markerP`, `markerB`, `raw`): `unknown`

#### Parameters

##### markerS

`"signature"`

##### markerP

`"pre-proof"` \| `"proof"`

##### markerB

`"pre-binding"` \| `"binding"`

##### raw

`Uint8Array`

#### Returns

`unknown`

***

### fromParts()

> **fromParts**(`networkId`): `object`

#### Parameters

##### networkId

`string`

#### Returns

`object`

##### prove()

> **prove**(...`args`): `Promise`\<\{ `bind`: `unknown`; \}\>

###### Parameters

###### args

...`never`[]

###### Returns

`Promise`\<\{ `bind`: `unknown`; \}\>

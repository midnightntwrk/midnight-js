[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / ParsedSerializedTag

# Interface: ParsedSerializedTag

Result of [parseSerializedTag](../variables/parseSerializedTag.md). `namespace` and `version` are the two
segments of the `namespace:version:` prefix; `tag` is their `:`-joined
form, kept for convenience where callers just want the whole prefix.
`body` is an independent copy of the bytes following the prefix — it does
not alias the input buffer.

## Properties

### body

> `readonly` **body**: `Uint8Array`

***

### namespace

> `readonly` **namespace**: `string`

***

### tag

> `readonly` **tag**: `string`

***

### version

> `readonly` **version**: `string`

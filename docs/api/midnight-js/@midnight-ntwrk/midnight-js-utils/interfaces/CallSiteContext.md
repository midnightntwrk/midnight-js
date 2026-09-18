[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / CallSiteContext

# Interface: CallSiteContext

Minimal context the caller of a typed deserialization wrapper must supply.
The `dataType` and `source` are baked into each wrapper.

## Properties

### caller

> `readonly` **caller**: `string`

***

### details?

> `readonly` `optional` **details?**: `Readonly`\<`Record`\<`string`, `string` \| `number`\>\>

Facts identifying the particular read that failed, rendered on the error
and kept on its `context`. Diagnosis only: nothing here changes the
classification or the mitigation.

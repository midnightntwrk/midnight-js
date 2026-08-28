[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractEventStore](../README.md) / FieldPrefixFilter

# Interface: FieldPrefixFilter

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:48

Matches a single indexed field's byte value against a hex `prefix`. When `fieldName` is omitted,
the prefix matches if **any** of the event's indexed fields starts with it.

## Properties

### fieldName?

> `readonly` `optional` **fieldName?**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:49

***

### prefix

> `readonly` **prefix**: `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:58

A hex string (with or without a leading `0x`), matched case-insensitively as a prefix of the
field's bytes. Matching is nibble-granular: use an **even-length** prefix for byte-accurate
matching (e.g. `'07'` matches only the byte `0x07`), since an odd-length prefix such as `'7'`
matches any field whose first byte is `0x70`–`0x7f`. An empty prefix matches any present field.
A prefix that is not valid hex fails the `query`/`subscribe` with a
[MalformedHexPrefixError.MalformedHexPrefixError](../../../effect/namespaces/MalformedHexPrefixError/classes/MalformedHexPrefixError.md) rather than silently matching nothing.

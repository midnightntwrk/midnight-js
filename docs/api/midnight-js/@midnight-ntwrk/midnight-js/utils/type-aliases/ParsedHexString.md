[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / ParsedHexString

# Type Alias: ParsedHexString

> **ParsedHexString** = `object`

Defined in: packages/utils/dist/index.d.ts:228

The result of parsing a string as a hex-encoded string.

## Properties

### byteChars

> `readonly` **byteChars**: `string`

Defined in: packages/utils/dist/index.d.ts:232

The captured sequence of _whole_ bytes found in the source string.

***

### hasPrefix

> `readonly` **hasPrefix**: `boolean`

Defined in: packages/utils/dist/index.d.ts:230

A flag indicating if the hex-string has a `'0x'` prefix.

***

### incompleteChars

> `readonly` **incompleteChars**: `string`

Defined in: packages/utils/dist/index.d.ts:235

The remaining characters of incomplete bytes and/or the non hexadecimal characters found
in the source string.

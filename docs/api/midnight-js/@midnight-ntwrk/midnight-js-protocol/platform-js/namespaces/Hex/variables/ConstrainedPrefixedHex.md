[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [Hex](../README.md) / ConstrainedPrefixedHex

# Variable: ConstrainedPrefixedHex

> `const` **ConstrainedPrefixedHex**: (`constraints`) => `Brand.Brand.Constructor`\<[`PrefixedHex`](../namespaces/Hex/type-aliases/PrefixedHex.md)\>

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Hex.d.ts:51

Creates a hex-encoded string, from some given constraints, that has a `'0x'` prefix.

## Parameters

### constraints

[`HexConstraints`](../interfaces/HexConstraints.md)

The [HexConstraints](../interfaces/HexConstraints.md) to apply when parsing a received hex-encoded string.

## Returns

`Brand.Brand.Constructor`\<[`PrefixedHex`](../namespaces/Hex/type-aliases/PrefixedHex.md)\>

A function that creates a [PrefixedHex](../namespaces/Hex/type-aliases/PrefixedHex.md) instance from a received string
ensuring that it meets `constraints`.

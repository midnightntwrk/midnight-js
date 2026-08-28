[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [Hex](../README.md) / ConstrainedPlainHex

# Variable: ConstrainedPlainHex

> `const` **ConstrainedPlainHex**: (`constraints`) => `Brand.Brand.Constructor`\<[`PlainHex`](../namespaces/Hex/type-aliases/PlainHex.md)\>

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Hex.d.ts:67

Creates a plain hex-encoded string, from some given constraints.

## Parameters

### constraints

[`HexConstraints`](../interfaces/HexConstraints.md)

The [HexConstraints](../interfaces/HexConstraints.md) to apply when parsing a received hex-encoded string.

## Returns

`Brand.Brand.Constructor`\<[`PlainHex`](../namespaces/Hex/type-aliases/PlainHex.md)\>

A function that creates a [PlainHex](../namespaces/Hex/type-aliases/PlainHex.md) instance from a received string
ensuring that it meets `constraints`.

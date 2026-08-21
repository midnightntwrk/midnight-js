[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [Hex](../README.md) / Hex

# Type Alias: Hex

> **Hex** = [`PlainHex`](../namespaces/Hex/type-aliases/PlainHex.md) \| [`PrefixedHex`](../namespaces/Hex/type-aliases/PrefixedHex.md)

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Hex.d.ts:21

A hex-encoded string, of some arbitrary byte length, that may or may not have a `'0x'` prefix.

## Remarks

`Hex` is a 'branded' string type defining a sequence of hexadecimal characters, and represented either as a
[PrefixedHex](../namespaces/Hex/type-aliases/PrefixedHex.md) or [PlainHex](../namespaces/Hex/type-aliases/PlainHex.md) instance.

It is possible to create custom `Hex` constructors that represent hex-encoded strings with specific constraints
(such as byte lengths), by invoking [ConstrainedPrefixedHex](../variables/ConstrainedPrefixedHex.md) or
[ConstrainedPlainHex](../variables/ConstrainedPlainHex.md) with options described by [HexConstraints](../interfaces/HexConstraints.md).

## See

 - [ConstrainedPrefixedHex](../variables/ConstrainedPrefixedHex.md)
 - [ConstrainedPlainHex](../variables/ConstrainedPlainHex.md)

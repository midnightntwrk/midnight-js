[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [SigningKey](../README.md) / make

# Variable: make

> `const` **make**: (`value`, `tag?`) => [`SigningKey`](../interfaces/SigningKey.md)

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/SigningKey.d.ts:74

Creates a [SigningKey](../interfaces/SigningKey.md) from a raw key value and an optional [SignatureKind](../type-aliases/SignatureKind.md).

## Parameters

### value

[`Value`](../namespaces/SigningKey/type-aliases/Value.md) \| `string`

The raw key value. A string source is validated and branded as a [SigningKey.Value](../namespaces/SigningKey/type-aliases/Value.md).

### tag?

[`SignatureKind`](../type-aliases/SignatureKind.md)

The [SignatureKind](../type-aliases/SignatureKind.md) the key is used with. Defaults to [DefaultSignatureKind](DefaultSignatureKind.md)
(`'schnorr'`).

## Returns

[`SigningKey`](../interfaces/SigningKey.md)

A [SigningKey](../interfaces/SigningKey.md).

[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [CoinPublicKey](../README.md) / make

# Variable: make

> `const` **make**: (`value`) => [`CoinPublicKey`](../type-aliases/CoinPublicKey.md)

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/CoinPublicKey.d.ts:79

Create a coin public key from a source string.

## Parameters

### value

`string`

The string value that is become a [CoinPublicKey](../type-aliases/CoinPublicKey.md).

## Returns

[`CoinPublicKey`](../type-aliases/CoinPublicKey.md)

A [CoinPublicKey](../type-aliases/CoinPublicKey.md) that is an instance of [CoinPublicKey.Hex](../namespaces/CoinPublicKey/type-aliases/Hex.md) if `value` could be
parsed as a hex-encoded string; otherwise as an instance of [CoinPublicKey.Bech32m](../namespaces/CoinPublicKey/type-aliases/Bech32m.md).

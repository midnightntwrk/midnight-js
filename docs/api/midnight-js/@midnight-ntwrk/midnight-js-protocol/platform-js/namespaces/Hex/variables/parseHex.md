[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [Hex](../README.md) / parseHex

# Variable: parseHex

> `const` **parseHex**: (`source`) => `Either.Either`\<[`ParsedHexString`](../interfaces/ParsedHexString.md), [`ParseError`](../../ParseError/classes/ParseError.md)\>

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/Hex.d.ts:111

Parses a hex-encoded string.

## Parameters

### source

`string`

The source string to parse.

## Returns

`Either.Either`\<[`ParsedHexString`](../interfaces/ParsedHexString.md), [`ParseError`](../../ParseError/classes/ParseError.md)\>

An `Either` with a `Right` value of [ParsedHexString](../interfaces/ParsedHexString.md) describing the parsed elements of `source`,
or a `Left` value of [ParseError](../../ParseError/classes/ParseError.md) if parsing fails.

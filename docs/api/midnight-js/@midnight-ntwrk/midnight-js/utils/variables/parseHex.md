[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / parseHex

# Variable: parseHex

> `const` **parseHex**: (`source`) => [`ParsedHexString`](../type-aliases/ParsedHexString.md)

Defined in: packages/utils/dist/index.d.ts:266

Parses a string as a hex-encoded string.

## Parameters

### source

`string`

The source string to parse.

## Returns

[`ParsedHexString`](../type-aliases/ParsedHexString.md)

A [ParsedHexString](../type-aliases/ParsedHexString.md) describing the parsed elements of `source`.

## Examples

```ts
parseHex('Hello') =>
  {
    hasPrefix: false,
    incompleteChars: 'Hello'
  }
```

```ts
parseHex('ab12e') =>
  {
    hasPrefix: false,
    byteChars: 'ab12'
    incompleteChars: 'e'
  }
```

```ts
parseHex('0xab12') =>
  {
    hasPrefix: true,
    byteChars: 'ab12'
    incompleteChars: ''
  }
```

[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / isValidSigningKey

# Variable: isValidSigningKey

> `const` **isValidSigningKey**: (`value`) => `boolean`

Defined in: packages/utils/dist/index.d.ts:401

Determines whether `value` is a structurally valid signing key of the shape
`{ tag: 'schnorr' | 'ecdsa', value: <hex> }`, where `value` is a non-empty,
even-length, lowercase-or-uppercase hex string of at least
SIGNING\_KEY\_MIN\_HEX\_LENGTH characters.

Pure predicate (never throws) so callers can attach their own domain error.

## Parameters

### value

`unknown`

The value to validate (typically a parsed import payload entry).

## Returns

`boolean`

`true` if `value` matches the structured signing-key shape.

[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / isValidSigningKey

# Variable: isValidSigningKey

> `const` **isValidSigningKey**: (`value`) => `value is SigningKey`

Determines whether `value` is a structurally valid signing key of the shape
`{ tag: 'schnorr' | 'ecdsa', value: <hex> }`, where `value` is a 32-byte key
written as exactly 64 lowercase-or-uppercase hex characters.

Pure predicate (never throws) so callers can attach their own domain error.

## Parameters

### value

`unknown`

The value to validate (typically a parsed import payload entry).

## Returns

`value is SigningKey`

`true` if `value` matches the structured signing-key shape.

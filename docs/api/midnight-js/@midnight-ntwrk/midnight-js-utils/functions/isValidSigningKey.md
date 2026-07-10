[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / isValidSigningKey

# Function: isValidSigningKey()

> **isValidSigningKey**(`value`): `boolean`

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

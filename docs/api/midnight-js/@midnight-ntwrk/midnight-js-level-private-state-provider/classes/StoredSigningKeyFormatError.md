[**Midnight.js API Reference v5.0.0-rc.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-level-private-state-provider](../README.md) / StoredSigningKeyFormatError

# Class: StoredSigningKeyFormatError

Thrown when a signing key read from the store is neither a structured
`SigningKey` nor a key written by a 4.x client.

## Extends

- `Error`

## Constructors

### Constructor

> **new StoredSigningKeyFormatError**(`contractAddress`): `StoredSigningKeyFormatError`

#### Parameters

##### contractAddress

`string`

#### Returns

`StoredSigningKeyFormatError`

#### Overrides

`Error.constructor`

## Properties

### contractAddress

> `readonly` **contractAddress**: `string`

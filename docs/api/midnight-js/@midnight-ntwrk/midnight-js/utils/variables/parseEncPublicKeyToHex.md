[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / parseEncPublicKeyToHex

# Variable: parseEncPublicKeyToHex

> `const` **parseEncPublicKeyToHex**: (`possibleBech32`, `zswapNetworkId`) => `string`

Defined in: packages/utils/dist/index.d.ts:326

Parses an encryption public key (in Bech32m or hex format) into a hex formatted string.

## Parameters

### possibleBech32

`string`

The input string, which can be a Bech32m-encoded encryption public key or a hex string.

### zswapNetworkId

[`NetworkId`](../../network-id/type-aliases/NetworkId.md)

The network ID used for decoding the Bech32m formatted string.

## Returns

`string`

The hex string representation of the encryption public key.

## Throws

`Error`
If the input string is not a valid hex string or a valid Bech32m-encoded encryption public key.

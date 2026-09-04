[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / assertIsContractAddress

# Function: assertIsContractAddress()

> **assertIsContractAddress**(`contractAddress`): `asserts contractAddress is string`

Defined in: packages/utils/dist/index.d.ts:413

**`Internal`**

Asserts that a string represents a hex-encoded contract address.

## Parameters

### contractAddress

`string`

The source string.

## Returns

`asserts contractAddress is string`

## Throws

`TypeError`
`contractAddress` is not a correctly formatted [ContractAddress](https://github.com/midnightntwrk/midnight-ledger).

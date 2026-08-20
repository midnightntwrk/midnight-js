[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / encodeContractKeyLocation

# Variable: encodeContractKeyLocation

> `const` **encodeContractKeyLocation**: (`location`) => `string`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractKeyLocation.d.ts:47

Encodes a [ContractKeyLocation](../interfaces/ContractKeyLocation.md) into the canonical grammar.

## Parameters

### location

[`ContractKeyLocation`](../interfaces/ContractKeyLocation.md)

## Returns

`string`

## Throws

Error If any component fails validation; an invalid component can never be a key
location, and silently encoding one would produce a location no prover can resolve.

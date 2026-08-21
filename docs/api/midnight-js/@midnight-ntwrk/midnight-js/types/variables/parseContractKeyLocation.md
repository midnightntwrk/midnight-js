[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / parseContractKeyLocation

# Variable: parseContractKeyLocation

> `const` **parseContractKeyLocation**: (`keyLocation`) => [`ContractKeyLocation`](../interfaces/ContractKeyLocation.md) \| `undefined`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractKeyLocation.d.ts:54

Parses a canonical key location, returning `undefined` when the input is not in the canonical
grammar (e.g. a bare circuit name, or a `midnight/` protocol builtin). Parsing is strict:
a string that begins with `contract:` but deviates from the grammar is rejected rather than
repaired, so that assembler and prover can never disagree about a location's meaning.

## Parameters

### keyLocation

`string`

## Returns

[`ContractKeyLocation`](../interfaces/ContractKeyLocation.md) \| `undefined`

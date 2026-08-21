[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / zkConfigToProvingKeyMaterial

# Variable: zkConfigToProvingKeyMaterial

> `const` **zkConfigToProvingKeyMaterial**: \<`K`\>(`zkConfig`) => `object`

Defined in: packages/types/dist/index.d.ts:87

Converts a ZKConfig object to ProvingKeyMaterial format.

## Type Parameters

### K

`K` *extends* `string`

## Parameters

### zkConfig

[`ZKConfig`](../interfaces/ZKConfig.md)\<`K`\>

## Returns

`object`

### ir

> **ir**: [`ZKIR`](../type-aliases/ZKIR.md)

### proverKey

> **proverKey**: [`ProverKey`](../type-aliases/ProverKey.md)

### verifierKey

> **verifierKey**: [`VerifierKey`](../type-aliases/VerifierKey.md)

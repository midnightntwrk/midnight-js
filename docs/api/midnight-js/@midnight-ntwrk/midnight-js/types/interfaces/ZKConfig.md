[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / ZKConfig

# Interface: ZKConfig\<K\>

Defined in: packages/types/dist/index.d.ts:65

Contains all information required by the [ProofProvider](ProofProvider.md)

## Type Parameters

### K

`K` *extends* `string`

The type of the circuit ID.

## Properties

### circuitId

> `readonly` **circuitId**: `K`

Defined in: packages/types/dist/index.d.ts:69

A circuit identifier.

***

### proverKey

> `readonly` **proverKey**: [`ProverKey`](../type-aliases/ProverKey.md)

Defined in: packages/types/dist/index.d.ts:73

The prover key corresponding to [ZKConfig.circuitId](#circuitid).

***

### verifierKey

> `readonly` **verifierKey**: [`VerifierKey`](../type-aliases/VerifierKey.md)

Defined in: packages/types/dist/index.d.ts:77

The verifier key corresponding to [ZKConfig.circuitId](#circuitid).

***

### zkir

> `readonly` **zkir**: [`ZKIR`](../type-aliases/ZKIR.md)

Defined in: packages/types/dist/index.d.ts:81

The zero-knowledge intermediate representation corresponding to [ZKConfig.circuitId](#circuitid).

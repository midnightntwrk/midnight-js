[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CircuitResult

# Interface: CircuitResult

What a retained-era circuit member returns: a plain object, NOT a `Promise`.

The absence of `Promise` here is the load-bearing half of the era
discriminator — a current-era circuit's `Promise<CircuitResults<...>>` has
none of these four members, so it is not assignable to this type.

## Properties

### context

> `readonly` **context**: `unknown`

***

### gasCost

> `readonly` **gasCost**: `unknown`

***

### proofData

> `readonly` **proofData**: `unknown`

***

### result

> `readonly` **result**: `unknown`

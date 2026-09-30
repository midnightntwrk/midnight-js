[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / RetainedContract

# Interface: RetainedContract

A retained-era contract, as the caller holds it: the CONSTRUCTED artifact the
previous toolchain generates.

Deliberately not compact-js's `CompiledContract` container. That container is
a recipe — a class plus witnesses, instantiated fresh per operation — and the
retained era's callers hold an instance whose witnesses are already bound.
containerFor adapts one to the other at this seam, which keeps the
adaptation in one place instead of on every consumer.

## Properties

### provableCircuits

> `readonly` **provableCircuits**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

The map compact-js indexes to find the circuit to run.

## Methods

### initialState()

> **initialState**(...`args`): `unknown`

The constructor a deployment runs.

#### Parameters

##### args

...`never`[]

#### Returns

`unknown`

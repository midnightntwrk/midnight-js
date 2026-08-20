[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CircuitResults

# Interface: CircuitResults\<PS, R\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:201

The results of the call to a Compact circuit

## Type Parameters

### PS

`PS` = `any`

### R

`R` = `any`

## Properties

### context

> **context**: [`CircuitContext`](CircuitContext.md)\<`PS`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:210

The updated context after the circuit execution, that can be used to
inform further runs

***

### gasCost

> **gasCost**: [`RunningCost`](../../onchain-runtime/type-aliases/RunningCost.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:214

The gas consumption of the circuit execution

***

### result

> **result**: `R`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:205

The primary result, as returned from Compact

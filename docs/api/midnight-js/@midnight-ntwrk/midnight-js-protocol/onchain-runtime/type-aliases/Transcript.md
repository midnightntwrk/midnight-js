[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / Transcript

# Type Alias: Transcript\<R\>

> **Transcript**\<`R`\> = `object`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:276

A transcript of operations, to be recorded in a transaction

## Type Parameters

### R

`R`

## Properties

### effects

> **effects**: [`Effects`](Effects.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:286

The effects of the transcript, which are checked before execution, and
must match those constructed by [program](#program)

***

### gas

> **gas**: [`RunningCost`](RunningCost.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:281

The execution budget for this transcript, which [program](#program) must not
exceed

***

### program

> **program**: [`Op`](Op.md)\<`R`\>[]

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:290

The sequence of operations that this transcript captured

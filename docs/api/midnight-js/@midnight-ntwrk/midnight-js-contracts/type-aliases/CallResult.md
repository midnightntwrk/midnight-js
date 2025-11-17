[**Midnight.js API Reference v3.0.0-alpha.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallResult

# Type Alias: CallResult\<C, ICK\>

> **CallResult**\<`C`, `ICK`\> = `object`

Contains all information resulting from circuit execution.

## Type Parameters

### C

`C` *extends* `Contract`

### ICK

`ICK` *extends* `ImpureCircuitId`\<`C`\>

## Properties

### private

> `readonly` **private**: [`CallResultPrivate`](CallResultPrivate.md)\<`C`, `ICK`\>

The private/sensitive data produced by the circuit execution.

***

### public

> `readonly` **public**: [`CallResultPublic`](CallResultPublic.md)

The public/non-sensitive data produced by the circuit execution.

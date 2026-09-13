[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / PartitionContext

# Interface: PartitionContext

The query-context state a call recorded while it ran, which its pre-call
state bytes do not carry.

`block` and `effects` are the PRE-call values; `comIndices` is the POST-call
map. Plain data on every member.

## See

 - [ComposeRefusalOrder](../../documents/ComposeRefusalOrder.md) for why partitioning needs the context the
circuit actually ran on, and why `CallContext` and `Effects` are declared
once against ledger-v9.
 - [RetainedEraExecution](../../documents/RetainedEraExecution.md) for why each member is read off the
context it is.
 - [EraSeam](../../documents/EraSeam.md)

## Properties

### block

> `readonly` **block**: [`CallContext`](https://github.com/midnightntwrk/midnight-ledger)

***

### comIndices

> `readonly` **comIndices**: `ReadonlyMap`\<`string`, `bigint`\>

Commitment -> the index the runtime recorded it at. Empty for a call that received no coin.

***

### effects

> `readonly` **effects**: [`Effects`](https://github.com/midnightntwrk/midnight-ledger)

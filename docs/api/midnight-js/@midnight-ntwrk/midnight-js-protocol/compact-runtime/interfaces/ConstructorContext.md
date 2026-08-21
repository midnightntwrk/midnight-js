[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / ConstructorContext

# Interface: ConstructorContext\<PS\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/constructor-context.d.ts:6

Passed to the constructor of a contract. Used to compute the contract's initial ledger state.

## Type Parameters

### PS

`PS` = `any`

## Properties

### initialPrivateState

> **initialPrivateState**: `PS`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/constructor-context.d.ts:10

The private state we would like to use to execute the contract's constructor.

***

### initialZswapLocalState

> **initialZswapLocalState**: [`EncodedZswapLocalState`](EncodedZswapLocalState.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/constructor-context.d.ts:14

An initial (usually empty) Zswap local state to use to execute the contract's constructor.

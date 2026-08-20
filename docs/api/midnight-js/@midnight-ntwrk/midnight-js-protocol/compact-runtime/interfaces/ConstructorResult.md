[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / ConstructorResult

# Interface: ConstructorResult\<PS\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/constructor-context.d.ts:26

The result of executing a contract constructor.

## Type Parameters

### PS

`PS` = `any`

## Properties

### currentContractState

> **currentContractState**: [`ContractState`](../../onchain-runtime/classes/ContractState.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/constructor-context.d.ts:30

The contract's initial ledger (public state).

***

### currentPrivateState

> **currentPrivateState**: `PS`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/constructor-context.d.ts:34

The contract's initial private state. Potentially different from the private state passed in [ConstructorContext](ConstructorContext.md).

***

### currentZswapLocalState

> **currentZswapLocalState**: [`EncodedZswapLocalState`](EncodedZswapLocalState.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/constructor-context.d.ts:38

The contract's initial Zswap local state. Potentially includes outputs created in the contract's constructor.

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractConstructorResult

# Interface: ContractConstructorResult\<C\>

Defined in: packages/contracts/dist/index.d.ts:239

The updated states resulting from executing a contract constructor.

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### nextContractState

> `readonly` **nextContractState**: [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:243

The public state resulting from executing the contract constructor.

***

### nextPrivateState

> `readonly` **nextPrivateState**: [`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:247

The private state resulting from executing the contract constructor.

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

Defined in: packages/contracts/dist/index.d.ts:251

The Zswap local state resulting from executing the contract constructor.

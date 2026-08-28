[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / ContractStateProvider

# Interface: ContractStateProvider

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/providers.d.ts:10

A user-provided interface for fetching the public state of a contract
at a given block hash. Used exclusively to retrieve the state of cross-contract
call targets at runtime. Assumes state returned is the post-block evaluation
contract state.

The `parentBlockHash` value in [CircuitContext](CircuitContext.md) is used for as the `blockHash` argument.

## Methods

### getContractState()

> **getContractState**(`blockHash`, `address`): `Promise`\<[`ContractState`](../../onchain-runtime/classes/ContractState.md) \| `undefined`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/providers.d.ts:11

#### Parameters

##### blockHash

`string`

##### address

`string`

#### Returns

`Promise`\<[`ContractState`](../../onchain-runtime/classes/ContractState.md) \| `undefined`\>

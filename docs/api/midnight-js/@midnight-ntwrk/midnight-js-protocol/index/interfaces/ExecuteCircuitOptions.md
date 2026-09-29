[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ExecuteCircuitOptions

# Interface: ExecuteCircuitOptions

Everything executeCircuit needs to run one impure circuit call.

## Properties

### address

> `readonly` **address**: `string`

***

### args

> `readonly` **args**: readonly `unknown`[]

***

### circuitId

> `readonly` **circuitId**: `string`

***

### coinPk

> `readonly` **coinPk**: `string`

***

### contract

> `readonly` **contract**: `Ledger8ContractLike`

***

### privateState

> `readonly` **privateState**: `unknown`

***

### state

> `readonly` **state**: [`ExecutableContractState`](ExecutableContractState.md)

The state to execute against AND the balances the contract holds, as one
value.

One member rather than two, because the two halves must describe the same
block. As separate options a caller could pass a balance read off another
block or another contract, and nothing here could tell. Build it with
toExecutableState, which takes one contract-state pojo.

#### See

[RetainedEraExecution](../../documents/RetainedEraExecution.md)

[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / createCircuitCallTxInterface

# Function: createCircuitCallTxInterface()

> **createCircuitCallTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `privateStateId?`): [`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

Creates a circuit call transaction interface for a RETAINED-ERA contract.

`privateStateId` is carried on every call this interface makes, exactly as
the current era's [createCircuitCallTxInterface](../../../functions/createCircuitCallTxInterface.md) carries it. A handle
that could not carry one would execute against a DEFAULT private state and
then discard the state each call produced, with nothing erroring at any
stage — see the private-state section of `docs/keep-state-pipeline.md`.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)\<`unknown`\>

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../type-aliases/CircuitId.md)\<`C`\>\>

The providers to use to build transactions.

### compiledContract

`C`

The retained-era contract instance to execute circuits on.

### contractAddress

`string`

The ledger address of the contract.

### privateStateId?

`string`

Where to read and store the contract's private state,
or `undefined` for a contract that carries none.

## Returns

[`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

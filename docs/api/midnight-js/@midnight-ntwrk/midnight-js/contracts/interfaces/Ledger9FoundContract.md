[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9FoundContract

# Interface: Ledger9FoundContract\<C\>

Base type for a deployed contract that has been found on the blockchain.

## Extended by

- [`Ledger9DeployedContract`](Ledger9DeployedContract.md)

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### callTx

> `readonly` **callTx**: [`Ledger9CircuitCallTxInterface`](../type-aliases/Ledger9CircuitCallTxInterface.md)\<`C`\>

Interface for creating call transactions for a contract.

***

### circuitMaintenanceTx

> `readonly` **circuitMaintenanceTx**: [`Ledger9CircuitMaintenanceTxInterfaces`](../type-aliases/Ledger9CircuitMaintenanceTxInterfaces.md)\<`C`\>

An interface for creating maintenance transactions for circuits defined in the
contract that was deployed.

***

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The compiled contract this handle executes circuits from, exactly as the
caller supplied it.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address this handle is attached to.

***

### contractMaintenanceTx

> `readonly` **contractMaintenanceTx**: [`Ledger9ContractMaintenanceTxInterface`](Ledger9ContractMaintenanceTxInterface.md)

Interface for creating maintenance transactions for the contract that was
deployed.

***

### deployTxData

> `readonly` **deployTxData**: [`Ledger9FoundDeployTxData`](Ledger9FoundDeployTxData.md)\<`C`\>

Data for the finalized deploy transaction corresponding to this contract. The deploy record is
tagged with the ledger era that recorded it: narrow on `public.era` before reading `tx` or
`initialContractState`.

***

### era

> `readonly` **era**: `"v9"`

The pipeline that produced this result: always ledger 9 here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

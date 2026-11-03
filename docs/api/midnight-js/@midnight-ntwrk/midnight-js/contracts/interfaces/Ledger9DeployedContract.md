[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9DeployedContract

# Interface: Ledger9DeployedContract\<C\>

Interface for a contract that has been deployed to the blockchain.

## Extends

- [`Ledger9FoundContract`](Ledger9FoundContract.md)\<`C`\>

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### callTx

> `readonly` **callTx**: [`Ledger9CircuitCallTxInterface`](../type-aliases/Ledger9CircuitCallTxInterface.md)\<`C`\>

Interface for creating call transactions for a contract.

#### Inherited from

[`Ledger9FoundContract`](Ledger9FoundContract.md).[`callTx`](Ledger9FoundContract.md#calltx)

***

### circuitMaintenanceTx

> `readonly` **circuitMaintenanceTx**: [`Ledger9CircuitMaintenanceTxInterfaces`](../type-aliases/Ledger9CircuitMaintenanceTxInterfaces.md)\<`C`\>

An interface for creating maintenance transactions for circuits defined in the
contract that was deployed.

#### Inherited from

[`Ledger9FoundContract`](Ledger9FoundContract.md).[`circuitMaintenanceTx`](Ledger9FoundContract.md#circuitmaintenancetx)

***

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The compiled contract this handle executes circuits from, exactly as the
caller supplied it.

#### Inherited from

[`Ledger9FoundContract`](Ledger9FoundContract.md).[`compiledContract`](Ledger9FoundContract.md#compiledcontract)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address this handle is attached to.

#### Inherited from

[`Ledger9FoundContract`](Ledger9FoundContract.md).[`contractAddress`](Ledger9FoundContract.md#contractaddress)

***

### contractMaintenanceTx

> `readonly` **contractMaintenanceTx**: [`Ledger9ContractMaintenanceTxInterface`](Ledger9ContractMaintenanceTxInterface.md)

Interface for creating maintenance transactions for the contract that was
deployed.

#### Inherited from

[`Ledger9FoundContract`](Ledger9FoundContract.md).[`contractMaintenanceTx`](Ledger9FoundContract.md#contractmaintenancetx)

***

### deployTxData

> `readonly` **deployTxData**: [`Ledger9FinalizedDeployTxData`](Ledger9FinalizedDeployTxData.md)\<`C`\>

Data resulting from the deployment transaction that created this contract. The information in a
[deployTxData](#deploytxdata) contains additional private information that does not
exist in [Ledger9FoundContract.deployTxData](Ledger9FoundContract.md#deploytxdata) because certain private data is only available to
the deployer of a contract.

#### Overrides

[`Ledger9FoundContract`](Ledger9FoundContract.md).[`deployTxData`](Ledger9FoundContract.md#deploytxdata)

***

### era

> `readonly` **era**: `"v9"`

The pipeline that produced this result: always ledger 9 here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

#### Inherited from

[`Ledger9FoundContract`](Ledger9FoundContract.md).[`era`](Ledger9FoundContract.md#era)

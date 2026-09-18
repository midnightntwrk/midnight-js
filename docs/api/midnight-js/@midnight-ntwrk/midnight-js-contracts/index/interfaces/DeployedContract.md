[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / DeployedContract

# Interface: DeployedContract\<C\>

Interface for a contract that has been deployed to the blockchain.

## Extends

- [`FoundContract`](FoundContract.md)\<`C`\>

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### callTx

> `readonly` **callTx**: [`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

Interface for creating call transactions for a contract.

#### Inherited from

[`FoundContract`](FoundContract.md).[`callTx`](FoundContract.md#calltx)

***

### circuitMaintenanceTx

> `readonly` **circuitMaintenanceTx**: [`CircuitMaintenanceTxInterfaces`](../type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>

An interface for creating maintenance transactions for circuits defined in the
contract that was deployed.

#### Inherited from

[`FoundContract`](FoundContract.md).[`circuitMaintenanceTx`](FoundContract.md#circuitmaintenancetx)

***

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The compiled contract this handle executes circuits from, exactly as the
caller supplied it.

#### Inherited from

[`FoundContract`](FoundContract.md).[`compiledContract`](FoundContract.md#compiledcontract)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The ledger address this handle is attached to.

#### Inherited from

[`FoundContract`](FoundContract.md).[`contractAddress`](FoundContract.md#contractaddress)

***

### contractMaintenanceTx

> `readonly` **contractMaintenanceTx**: [`ContractMaintenanceTxInterface`](ContractMaintenanceTxInterface.md)

Interface for creating maintenance transactions for the contract that was
deployed.

#### Inherited from

[`FoundContract`](FoundContract.md).[`contractMaintenanceTx`](FoundContract.md#contractmaintenancetx)

***

### deployTxData

> `readonly` **deployTxData**: [`FinalizedDeployTxData`](FinalizedDeployTxData.md)\<`C`\>

Data resulting from the deployment transaction that created this contract. The information in a
[deployTxData](#deploytxdata) contains additional private information that does not
exist in [FoundContract.deployTxData](FoundContract.md#deploytxdata) because certain private data is only available to
the deployer of a contract.

#### Overrides

[`FoundContract`](FoundContract.md).[`deployTxData`](FoundContract.md#deploytxdata)

***

### era

> `readonly` **era**: `"ledger9"`

The pipeline that produced this result: always the current era here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

#### Inherited from

[`FoundContract`](FoundContract.md).[`era`](FoundContract.md#era)

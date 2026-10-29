[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8DeployedContract

# Interface: Ledger8DeployedContract\<C\>

A retained-era contract deployed by the caller.

It differs from [Ledger8FoundContract](Ledger8FoundContract.md) only in its
[Ledger8DeployedContract.deployTxData](#deploytxdata), which carries what the
constructor produced and a signing key that is always present.

Exported flat so a caller that receives one by inference can also NAME it, and
a dApp's declaration emit can write it. This is what `deployContract`'s
retained-era overload answers with.

## Extends

- [`Ledger8FoundContract`](Ledger8FoundContract.md)\<`C`\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

## Properties

### callTx

> `readonly` **callTx**: [`Ledger8CircuitCallTxInterface`](../type-aliases/Ledger8CircuitCallTxInterface.md)\<`C`\>

One function per circuit the artifact declares, each bound to
[Ledger8FoundContract.contractAddress](Ledger8FoundContract.md#contractaddress) and to the private state id
the attach or the deploy named — so a call needs only the circuit's own
arguments.

#### Inherited from

[`Ledger8FoundContract`](Ledger8FoundContract.md).[`callTx`](Ledger8FoundContract.md#calltx)

***

### circuitMaintenanceTx

> `readonly` **circuitMaintenanceTx**: [`Ledger8CircuitMaintenanceTxInterfaces`](../type-aliases/Ledger8CircuitMaintenanceTxInterfaces.md)\<`C`\>

One maintenance interface per circuit the artifact declares, bound to this address.

#### Inherited from

[`Ledger8FoundContract`](Ledger8FoundContract.md).[`circuitMaintenanceTx`](Ledger8FoundContract.md#circuitmaintenancetx)

***

### compiledContract

> `readonly` **compiledContract**: `C`

The artifact this handle was built from: the caller's own contract instance, unchanged.

#### Inherited from

[`Ledger8FoundContract`](Ledger8FoundContract.md).[`compiledContract`](Ledger8FoundContract.md#compiledcontract)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address on chain every call made through [Ledger8FoundContract.callTx](Ledger8FoundContract.md#calltx) targets.

#### Inherited from

[`Ledger8FoundContract`](Ledger8FoundContract.md).[`contractAddress`](Ledger8FoundContract.md#contractaddress)

***

### contractMaintenanceTx

> `readonly` **contractMaintenanceTx**: [`Ledger8ContractMaintenanceTxInterface`](Ledger8ContractMaintenanceTxInterface.md)

The contract-wide maintenance interface, bound to this address.

#### Inherited from

[`Ledger8FoundContract`](Ledger8FoundContract.md).[`contractMaintenanceTx`](Ledger8FoundContract.md#contractmaintenancetx)

***

### deployTxData

> `readonly` **deployTxData**: [`Ledger8DeployTxData`](Ledger8DeployTxData.md)\<`C`\>

See [Ledger8DeployTxData](Ledger8DeployTxData.md).

#### Overrides

[`Ledger8FoundContract`](Ledger8FoundContract.md).[`deployTxData`](Ledger8FoundContract.md#deploytxdata)

***

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

#### Inherited from

[`Ledger8FoundContract`](Ledger8FoundContract.md).[`era`](Ledger8FoundContract.md#era)

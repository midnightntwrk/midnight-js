[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / DeployedContract

# Interface: DeployedContract\<C\>

A retained-era contract deployed by the caller.

It differs from [Ledger8FoundContract](FoundContract.md) only in its
[Ledger8DeployedContract.deployTxData](#deploytxdata), which carries what the
constructor produced and a signing key that is always present.

Published under the retained-era namespace so a caller that receives one by
inference can also NAME it. This is what `deployContract`'s retained-era overload
answers with.

## Extends

- [`FoundContract`](FoundContract.md)\<`C`\>

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

## Properties

### callTx

> `readonly` **callTx**: [`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

One function per circuit the artifact declares, each bound to
[Ledger8FoundContract.contractAddress](FoundContract.md#contractaddress) and to the private state id
the attach or the deploy named — so a call needs only the circuit's own
arguments.

#### Inherited from

[`FoundContract`](FoundContract.md).[`callTx`](FoundContract.md#calltx)

***

### circuitMaintenanceTx

> `readonly` **circuitMaintenanceTx**: [`CircuitMaintenanceTxInterfaces`](../type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>

One maintenance interface per circuit the artifact declares, bound to this address.

#### Inherited from

[`FoundContract`](FoundContract.md).[`circuitMaintenanceTx`](FoundContract.md#circuitmaintenancetx)

***

### compiledContract

> `readonly` **compiledContract**: `C`

The artifact this handle was built from: the caller's own contract instance, unchanged.

#### Inherited from

[`FoundContract`](FoundContract.md).[`compiledContract`](FoundContract.md#compiledcontract)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address on chain every call made through [Ledger8FoundContract.callTx](FoundContract.md#calltx) targets.

#### Inherited from

[`FoundContract`](FoundContract.md).[`contractAddress`](FoundContract.md#contractaddress)

***

### contractMaintenanceTx

> `readonly` **contractMaintenanceTx**: [`ContractMaintenanceTxInterface`](ContractMaintenanceTxInterface.md)

The contract-wide maintenance interface, bound to this address.

#### Inherited from

[`FoundContract`](FoundContract.md).[`contractMaintenanceTx`](FoundContract.md#contractmaintenancetx)

***

### deployTxData

> `readonly` **deployTxData**: [`DeployTxData`](DeployTxData.md)\<`C`\>

See [Ledger8DeployTxData](DeployTxData.md).

#### Overrides

[`FoundContract`](FoundContract.md).[`deployTxData`](FoundContract.md#deploytxdata)

***

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

#### Inherited from

[`FoundContract`](FoundContract.md).[`era`](FoundContract.md#era)

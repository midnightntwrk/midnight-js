[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / FoundContract

# Interface: FoundContract\<C\>

A retained-era contract found on the blockchain.

Carries a [Ledger8CircuitCallTxInterface](../type-aliases/CircuitCallTxInterface.md) for the same reason the
current era's `FoundContract` carries one: a caller that has just supplied
the contract and its address should not have to supply them again to call it.

It carries the maintenance interfaces the current era's `FoundContract` carries,
for the same reason. They work only before the fork; after it, the same contract
is maintained through a handle built from the recompiled artifact.

## Extended by

- [`DeployedContract`](DeployedContract.md)

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

## Properties

### callTx

> `readonly` **callTx**: [`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

One function per circuit the artifact declares, each bound to
[Ledger8FoundContract.contractAddress](#contractaddress) and to the private state id
the attach or the deploy named — so a call needs only the circuit's own
arguments.

***

### circuitMaintenanceTx

> `readonly` **circuitMaintenanceTx**: [`CircuitMaintenanceTxInterfaces`](../type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>

One maintenance interface per circuit the artifact declares, bound to this address.

***

### compiledContract

> `readonly` **compiledContract**: `C`

The artifact this handle was built from: the caller's own contract instance, unchanged.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address on chain every call made through [Ledger8FoundContract.callTx](#calltx) targets.

***

### contractMaintenanceTx

> `readonly` **contractMaintenanceTx**: [`ContractMaintenanceTxInterface`](ContractMaintenanceTxInterface.md)

The contract-wide maintenance interface, bound to this address.

***

### deployTxData

> `readonly` **deployTxData**: [`FoundDeployTxData`](FoundDeployTxData.md)\<`C`\>

The deploy record under `public` and what this device holds for the
contract under `private`, at the same paths as on the current era's
`FoundContract.deployTxData`.

***

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

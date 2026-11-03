[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8FoundContract

# Interface: Ledger8FoundContract\<C\>

A retained-era contract found on the blockchain.

Carries a [Ledger8CircuitCallTxInterface](../type-aliases/Ledger8CircuitCallTxInterface.md) for the same reason
`Ledger9FoundContract` carries one: a caller that has just supplied
the contract and its address should not have to supply them again to call it.

It carries the maintenance interfaces `Ledger9FoundContract` carries,
for the same reason. They work only before the fork; after it, the same contract
is maintained through a handle built from the recompiled artifact.

## Extended by

- [`Ledger8DeployedContract`](Ledger8DeployedContract.md)

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

## Properties

### callTx

> `readonly` **callTx**: [`Ledger8CircuitCallTxInterface`](../type-aliases/Ledger8CircuitCallTxInterface.md)\<`C`\>

One function per circuit the artifact declares, each bound to
[Ledger8FoundContract.contractAddress](#contractaddress) and to the private state id
the attach or the deploy named — so a call needs only the circuit's own
arguments.

***

### circuitMaintenanceTx

> `readonly` **circuitMaintenanceTx**: [`Ledger8CircuitMaintenanceTxInterfaces`](../type-aliases/Ledger8CircuitMaintenanceTxInterfaces.md)\<`C`\>

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

> `readonly` **contractMaintenanceTx**: [`Ledger8ContractMaintenanceTxInterface`](Ledger8ContractMaintenanceTxInterface.md)

The contract-wide maintenance interface, bound to this address.

***

### deployTxData

> `readonly` **deployTxData**: [`Ledger8FoundDeployTxData`](Ledger8FoundDeployTxData.md)\<`C`\>

The deploy record under `public` and what this device holds for the
contract under `private`, at the same paths as on the current era's
`Ledger9FoundContract.deployTxData`.

***

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

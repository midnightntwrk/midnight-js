[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / FoundContract

# Interface: FoundContract\<C\>

A retained-era contract found on the blockchain.

Carries a [Ledger8CircuitCallTxInterface](../type-aliases/CircuitCallTxInterface.md) for the same reason the
current era's `FoundContract` carries one: a caller that has just supplied
the contract and its address should not have to supply them again to call it.

The maintenance interfaces the current era's `FoundContract` also carries are
NOT here: the retained era has no governance arm at all, so there is nothing
for them to reach.

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

### compiledContract

> `readonly` **compiledContract**: `C`

The artifact this handle was built from: the caller's own contract instance, unchanged.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address on chain every call made through [Ledger8FoundContract.callTx](#calltx) targets.

***

### deployTxData

> `readonly` **deployTxData**: [`VersionedFinalizedTxData`](../../../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)

The record of the transaction that DEPLOYED this contract, version-tagged
because a retained-era contract was deployed in whichever era was current
at the time — narrow it with `switch (deployTxData.version)`.

SHAPED DIFFERENTLY from the current era's `FoundContract.deployTxData`,
which is a `FinalizedDeployTxData` whose transaction id sits under
`.public`. Here the record is the read surface's own
`VersionedFinalizedTxData`, so `txId`, `status` and the rest are top-level
members. Code written against one era does not read the other's record
unchanged.

***

### era

> `readonly` **era**: `"ledger8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

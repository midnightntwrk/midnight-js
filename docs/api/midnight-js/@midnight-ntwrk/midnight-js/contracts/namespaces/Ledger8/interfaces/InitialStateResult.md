[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / InitialStateResult

# Interface: InitialStateResult\<PS\>

What a retained-era artifact's own `initialState` returns: a plain object,
NOT a `Promise`.

A declaration OF THE ARTIFACT, not a framework result. It is the shape
[Ledger8Contract.initialState](Contract.md#initialstate) is read through, and it is what makes
the era discriminable at the type level -- the current era's `initialState`
answers with a `Promise`.

Deliberately NOT the retained counterpart of `ContractConstructorResult`,
which is a framework result carrying `era` and `next*` members. There is no
retained counterpart of that type: the constructor output a retained deploy
would publish is spread across `Ledger8DeployedContract`'s `initial*`
members, and nothing constructs one today. This type was called
`Ledger8ConstructorResult`, which put a false pairing next to
`ContractConstructorResult` on the published surface.

## Type Parameters

### PS

`PS` = `unknown`

## Properties

### currentContractState

> `readonly` **currentContractState**: `unknown`

***

### currentPrivateState

> `readonly` **currentPrivateState**: `PS`

***

### currentZswapLocalState

> `readonly` **currentZswapLocalState**: `unknown`

[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / DeployedContract

# Interface: DeployedContract\<C\>

A retained-era contract deployed by the caller.

It differs from [Ledger8FoundContract](FoundContract.md) in ONE thing: its
[Ledger8DeployedContract.signingKey](#signingkey) is REQUIRED where the found
handle's may be `undefined`. The key itself is no longer something only a
deployer has -- the deploy stores it, and an attach through the same provider
reports it back -- so what a deploy guarantees is that there IS one, not that
nobody else could hold it.

Published under the retained-era namespace so a caller that receives one by
inference can also NAME it. This is what `deployContract`'s retained-era arm
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

### deployTxData

> `readonly` **deployTxData**: [`VersionedFinalizedTxData`](../../../../types/type-aliases/VersionedFinalizedTxData.md)

The record of the transaction that DEPLOYED this contract, version-tagged
because a retained-era contract was deployed in whichever era was current
at the time — narrow it with `switch (deployTxData.version)`.

SHAPED DIFFERENTLY from the current era's `FoundContract.deployTxData`,
which is a `FinalizedDeployTxData` whose transaction id sits under
`.public`. Here the record is the read surface's own
`VersionedFinalizedTxData`, so `txId`, `status` and the rest are top-level
members. Code written against one era does not read the other's record
unchanged.

#### Inherited from

[`FoundContract`](FoundContract.md).[`deployTxData`](FoundContract.md#deploytxdata)

***

### era

> `readonly` **era**: `"ledger8"`

The pipeline that produced this result: always the retained era here, even
when the transaction that recorded it is a keep-state transaction tagged
`'v9'`. Those are different facts, and only this one says which module
produced the objects below.

#### Inherited from

[`FoundContract`](FoundContract.md).[`era`](FoundContract.md#era)

***

### initialContractState

> `readonly` **initialContractState**: `Ledger8DeployableContractState`

The state the contract was deployed with, as the LIVE handle the retained
constructor built. See ADR-0010 for its lifetime, and prefer
[Ledger8DeployedContract.initialState](#initialstate) for anything that has to
outlive the runtime instance.

***

### initialPrivateState

> `readonly` **initialPrivateState**: [`PrivateState`](../type-aliases/PrivateState.md)\<`C`\>

The private state the constructor produced.

#### Remarks

**Privacy-sensitive.**

***

### initialState

> `readonly` **initialState**: `Uint8Array`

The same state, serialized — the bytes the contract address was derived
from. A deploy mints a fresh nonce, so these bytes and that address belong
to each other and to no other deployment.

***

### initialZswapState

> `readonly` **initialZswapState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state the constructor ended on, carrying any coin it
minted. Empty for a constructor that minted none.

#### Remarks

**Privacy-sensitive.** Shielded coin material.

***

### signingKey

> `readonly` **signingKey**: `string`

The key the deployed contract's maintenance authority was built from: ONE
verifying key at threshold 1, so this single key is the whole authority.

SAMPLED here when the caller named none on the deploy options, and stored
against [Ledger8FoundContract.contractAddress](FoundContract.md#contractaddress) in the private-state
provider once the chain has recorded the deployment — the same storage and
the same moment the current era's deploy writes its own key to. Attaching
to the same address through the same provider reports it again on
[Ledger8FoundContract.signingKey](FoundContract.md#signingkey).

The provider is the ONLY copy besides this handle. It is not on chain and
not derivable from anything that is, so a store that is lost, cleared or
never persisted takes the authority with it: no verifier key can then be
inserted, removed or replaced on that contract by anyone.

#### Remarks

**Privacy-sensitive.** Signing-key material.

#### Overrides

[`FoundContract`](FoundContract.md).[`signingKey`](FoundContract.md#signingkey)

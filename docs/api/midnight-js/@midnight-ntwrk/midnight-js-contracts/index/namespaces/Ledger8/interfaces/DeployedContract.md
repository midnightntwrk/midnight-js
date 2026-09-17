[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployedContract

# Interface: DeployedContract\<C\>

A retained-era contract deployed by the caller, which additionally holds the
signing key registered as the contract's maintenance authority — something
only the deployer has.

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
NOWHERE by this framework — not in the private-state provider, not on
chain, and not recoverable from either. This handle is the only place a
sampled key ever appears, so a caller that wants it later has to persist it
itself, before the handle goes out of scope.

Lost, the authority is unreachable for good: no verifier key can be
inserted, removed or replaced on that contract by anyone. Attaching again
does not recover it — see
[Ledger8FindDeployedContractOptions.signingKey](FindDeployedContractOptions.md#signingkey), which is not a route
back in.

#### Remarks

**Privacy-sensitive.** Signing-key material.

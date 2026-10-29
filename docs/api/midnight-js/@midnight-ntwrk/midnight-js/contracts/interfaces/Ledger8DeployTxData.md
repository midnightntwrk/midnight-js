[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8DeployTxData

# Interface: Ledger8DeployTxData\<C\>

The deploy data of a retained-era contract deployed by the caller: the
[Ledger8FoundDeployTxData](Ledger8FoundDeployTxData.md) structure, carrying what the constructor
produced as well.

## Remarks

**Privacy-sensitive.** `private` carries signing-key material,
private state and shielded coin material.

## Extends

- [`Ledger8FoundDeployTxData`](Ledger8FoundDeployTxData.md)\<`C`\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

## Properties

### era

> `readonly` **era**: `"v8"`

The pipeline this handle runs on: always the retained era here. The era
that recorded the deploy transaction is `public.era`.

#### Inherited from

[`Ledger8FoundDeployTxData`](Ledger8FoundDeployTxData.md).[`era`](Ledger8FoundDeployTxData.md#era)

***

### private

> `readonly` **private**: `object`

What this device holds for the contract.

#### initialPrivateState

> `readonly` **initialPrivateState**: [`Ledger8PrivateState`](../type-aliases/Ledger8PrivateState.md)\<`C`\>

The private state the constructor produced.

##### Remarks

**Privacy-sensitive.**

#### initialZswapState

> `readonly` **initialZswapState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state the constructor ended on, carrying any coin it
minted. Empty for a constructor that minted none.

##### Remarks

**Privacy-sensitive.** Shielded coin material.

#### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The key the deployed contract's maintenance authority was built from: ONE
verifying key at threshold 1, so this single key is the whole authority.

SAMPLED when the caller named none on the deploy options, and stored
against the contract address in the private-state provider once the chain
has recorded the deployment — the same storage and the same moment the
current era's deploy writes its own key to. Attaching to the same address
through the same provider reports it again.

The provider is the ONLY copy besides this handle. It is not on chain and
not derivable from anything that is, so a store that is lost, cleared or
never persisted takes the authority with it: no verifier key can then be
inserted, removed or replaced on that contract by anyone.

##### Remarks

**Privacy-sensitive.** Signing-key material.

#### Remarks

**Privacy-sensitive.** Signing-key material and private state.

#### Overrides

[`Ledger8FoundDeployTxData`](Ledger8FoundDeployTxData.md).[`private`](Ledger8FoundDeployTxData.md#private)

***

### public

> `readonly` **public**: [`Ledger8FoundDeployTxPublicData`](Ledger8FoundDeployTxPublicData.md) & `object`

The record of the deploy transaction, always a ledger 8 one: a retained-era
deploy runs only before the fork.

#### Type Declaration

##### initialContractState

> `readonly` **initialContractState**: `Ledger8SerializableContractState`

The state the contract was deployed with, as the LIVE handle the retained
constructor built. See ADR-0010 for its lifetime, and prefer
`initialContractStateBytes` for anything that has to outlive the runtime
instance.

##### initialContractStateBytes

> `readonly` **initialContractStateBytes**: `Uint8Array`

The same state, serialized — the bytes the contract address was derived
from. A deploy mints a fresh nonce, so these bytes and that address belong
to each other and to no other deployment.

#### Overrides

[`Ledger8FoundDeployTxData`](Ledger8FoundDeployTxData.md).[`public`](Ledger8FoundDeployTxData.md#public)

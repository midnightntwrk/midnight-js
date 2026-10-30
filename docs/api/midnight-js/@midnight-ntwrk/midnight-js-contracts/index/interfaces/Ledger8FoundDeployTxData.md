[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8FoundDeployTxData

# Interface: Ledger8FoundDeployTxData\<C\>

The deploy data of a retained-era contract found on chain: the same
`{ era, public, private }` structure `Ledger9FoundDeployTxData`
has, so a caller reads `deployTxData.public.txId` and
`deployTxData.private.signingKey` identically in both eras.

## Remarks

**Privacy-sensitive.** `private` carries signing-key material and
private state. Read only `public` when logging or transmitting.

## Extended by

- [`Ledger8FinalizedDeployTxData`](Ledger8FinalizedDeployTxData.md)

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

## Properties

### era

> `readonly` **era**: `"v8"`

The pipeline this handle runs on: always the retained era here. The era
that recorded the deploy transaction is `public.era`.

***

### private

> `readonly` **private**: `object`

What this device holds for the contract.

#### initialPrivateState

> `readonly` **initialPrivateState**: [`Ledger8PrivateState`](../type-aliases/Ledger8PrivateState.md)\<`C`\> \| `undefined`

The private state the attach seeded, or the one already stored under the
id it named; `undefined` when it named none.

##### Remarks

**Privacy-sensitive.**

#### signingKey

> `readonly` **signingKey**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger) \| `undefined`

The key this framework holds for the contract's maintenance authority, or
`undefined` when it holds none it can use.

ALWAYS PRESENT and possibly `undefined`, rather than optional. REQUIRED on
[Ledger8FinalizedDeployTxData](Ledger8FinalizedDeployTxData.md): a deploy always has a key, because it built
the authority; an attach has one only if a deploy on this machine stored
it, or the caller supplied one through
[Ledger8FindDeployedContractOptions.signingKey](Ledger8FindDeployedContractOptions.md#signingkey).

`undefined` COLLAPSES THREE CASES, and a caller that needs to tell them
apart has to look at the logger rather than at this field:

1. nothing is stored for this address;
2. something is stored that this framework did not write -- an entry naming
   the other signature kind, which the CURRENT era legitimately stores
   under the same address in the same provider, or one whose value is not
   the shape a retained-era key has;
3. the entry could not be READ at all, because `getSigningKey` rejected: a
   wrong store password, a rotation-lock timeout, store I/O, or an entry the
   provider refuses as not a signing key.

Neither 2 nor 3 fails the attach. Both are reported to the logger provider
as a DEBUG-level dispatch breadcrumb, which is the only place the three
cases are distinguishable.

The remedy for case 2, and for a refused entry in case 3, is the caller's
either way: pass the retained-era key on
[Ledger8FindDeployedContractOptions.signingKey](Ledger8FindDeployedContractOptions.md#signingkey), which replaces the
entry, or remove the entry with
`privateStateProvider.removeSigningKey(address)` first.

##### Remarks

**Privacy-sensitive.** Signing-key material.

##### See

[KeepStatePipeline](../../documents/KeepStatePipeline.md) for why the member is not optional, and why
an unreadable entry does not fail the attach.

#### Remarks

**Privacy-sensitive.** Signing-key material and private state.

***

### public

> `readonly` **public**: [`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md) & `object`

The record of the transaction that DEPLOYED the contract, and the address
it created. Version-tagged because a retained-era contract was deployed in
whichever era was current at the time — narrow it with
`switch (deployTxData.public.era)`.

#### Type Declaration

##### contractAddress

> `readonly` **contractAddress**: `string`

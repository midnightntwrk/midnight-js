[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / FindDeployedContractOptions

# Interface: FindDeployedContractOptions\<C\>

Configuration for attaching to an already-deployed retained-era contract.

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

## Properties

### compiledContract

> `readonly` **compiledContract**: `C`

***

### contractAddress

> `readonly` **contractAddress**: `string`

***

### initialPrivateState?

> `readonly` `optional` **initialPrivateState?**: [`PrivateState`](../type-aliases/PrivateState.md)\<`C`\>

The private state to store at [Ledger8FindDeployedContractOptions.privateStateId](#privatestateid),
overwriting whatever is held there.

Honoured by the same six-case rule the current era's `findDeployedContract`
applies, and it is the same rule rather than a second copy of it. Supplying
this without an id is a caller error: there is nowhere to put the state, and
`IncompleteFindContractPrivateStateConfig` says so rather than the state
being dropped.

#### Remarks

**Privacy-sensitive.**

***

### privateStateId?

> `readonly` `optional` **privateStateId?**: `string`

Where the calls made through [Ledger8FoundContract.callTx](FoundContract.md#calltx) read and
store this contract's private state.

Optional because a retained-era contract may genuinely carry none: OMITTING
the property means nothing is read and nothing is written. Naming one the
provider holds nothing under is a caller error and is refused, rather than
executing against a default state — and so is writing the property with an
undefined value, which is a caller that believes it named an id.

***

### signingKey?

> `readonly` `optional` **signingKey?**: `string`

The key to record as this contract's maintenance authority key, for a
caller that holds one and deployed the contract somewhere else.

VALIDATED BEFORE IT IS STORED, and a key this framework could not store and
read back is refused with `Ledger8SigningKeyUnusableError` rather than
written. A retained-era key is exactly 64 hexadecimal characters, which is
what that era's `sampleSigningKey` produces; this type is `string`, so a
shorter one type-checks. Stored unchecked, it would be reported on the
attach that supplied it and read as ABSENT on the next one -- and the entry
it replaced would already be gone. Nothing is written when it is refused.

Stored against [Ledger8FindDeployedContractOptions.contractAddress](#contractaddress)
in the private-state provider, which is the same storage
[Ledger8DeployedContract.signingKey](DeployedContract.md#signingkey) is written to -- so a key
supplied here REPLACES whatever is held for that address, and is what
[Ledger8FoundContract.signingKey](FoundContract.md#signingkey) then reports. Replacing is the
documented remedy for an entry this framework cannot use, so it wins over a
stored entry rather than falling back to one.

OMITTING it reports the key already stored, and stores nothing. Where the
current era's `findDeployedContract` samples a fresh key when none is
stored, this arm reports none: a sampled key bears no relation to the
authority the chain holds for a contract this caller did not deploy, and
[Ledger8FoundContract](FoundContract.md) carries no maintenance interface for one to be
used through.

#### Remarks

**Privacy-sensitive.** Signing-key material.

[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / FindDeployedContractOptions

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

VALIDATED BEFORE IT IS STORED. A retained-era key is exactly 64 hexadecimal
characters, which is what that era's `sampleSigningKey` produces; this type
is `string`, so a shorter one type-checks and is refused with
`Ledger8SigningKeyUnusableError`. Nothing is written when it is refused.

Stored against [Ledger8FindDeployedContractOptions.contractAddress](#contractaddress)
in the private-state provider, which is the same storage
[Ledger8DeployedContract.signingKey](DeployedContract.md#signingkey) is written to -- so a key
supplied here REPLACES whatever is held for that address, and is what
[Ledger8FoundContract.signingKey](FoundContract.md#signingkey) then reports.

OMITTING it reports the key already stored, and stores nothing. It does NOT
sample a fresh key when none is stored, where the current era's
`findDeployedContract` does.

#### Remarks

**Privacy-sensitive.** Signing-key material.

#### See

[KeepStatePipeline](../../../../documents/KeepStatePipeline.md) for why this arm samples nothing, and why a
supplied key replaces a stored one rather than falling back to it.

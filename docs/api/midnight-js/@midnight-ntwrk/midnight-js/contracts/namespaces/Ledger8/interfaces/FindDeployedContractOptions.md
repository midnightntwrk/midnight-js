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

NOT HONOURED on this arm: a key supplied here is DISCARDED.

The current era's `findDeployedContract` stores this key against the
contract address in the private-state provider, so a caller that deployed
the contract elsewhere can still issue maintenance transactions for it.
The retained arm stores nothing, so passing a key here has no effect —
which is recorded at the field rather than left for a caller to discover,
because a silently discarded key reads as a stored one.

The field is retained rather than removed so this arm's options stay the
shape the current era's are, and so it can start being honoured without a
change to the type: honouring it is client-side storage, which is
era-independent, so nothing about the retained ledger prevents it.

There is NO framework storage a retained key fits today, and none to fall
back on: `PrivateStateProvider.setSigningKey` takes the CURRENT era's
`{ tag, value }` key, while Ledger8SigningKey is a bare string, so
handing one to that method does not compile. A caller that needs the key
keeps it itself, outside this framework.

The key this field would take is the one
[Ledger8DeployedContract.signingKey](DeployedContract.md#signingkey) reports, which the deploy arm
samples when the caller named none and persists nowhere. So the deploy ->
attach round trip is not supported in either direction: the deploy does not
store the key, and this field does not read one back. A caller that never
copied it off the deploy handle cannot maintain that contract again.

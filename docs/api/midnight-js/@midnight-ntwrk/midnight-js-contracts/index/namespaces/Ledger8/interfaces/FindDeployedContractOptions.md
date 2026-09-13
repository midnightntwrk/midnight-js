[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

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

### privateStateId?

> `readonly` `optional` **privateStateId?**: `string`

Where the calls made through [Ledger8FoundContract.callTx](FoundContract.md#calltx) read and
store this contract's private state.

Optional because a retained-era contract may genuinely carry none: naming
no id means nothing is read and nothing is written. Naming one the provider
holds nothing under is a caller error and is refused, rather than executing
against a default state.

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

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
era-independent, so nothing about the retained ledger prevents it. Store
the key yourself, through the private-state provider, if you need it for a
retained-era contract in the meantime.

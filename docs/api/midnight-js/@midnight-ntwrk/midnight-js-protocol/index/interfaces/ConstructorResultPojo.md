[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ConstructorResultPojo

# Interface: ConstructorResultPojo

The result of running a pre-fork constructor: the freshly built contract
state (still carrying blank verifier keys on every operation slot — see
composeV8DeployTx) and the resulting private state.

## Properties

### contractState

> `readonly` **contractState**: [`Ledger8DeployableContractState`](../type-aliases/Ledger8DeployableContractState.md)

***

### privateState

> `readonly` **privateState**: `unknown`

***

### zswapLocalState

> `readonly` **zswapLocalState**: `ZswapLocalState`

The constructor's own Zswap local state, DECODED — plain data in both
runtimes. Empty for the ordinary constructor that mints nothing; carries
the outputs for one that does, which is what lets the deploy be balanced.

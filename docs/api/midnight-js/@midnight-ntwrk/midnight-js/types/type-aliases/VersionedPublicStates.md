[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / VersionedPublicStates

# Type Alias: VersionedPublicStates

> **VersionedPublicStates** = [`Ledger8PublicStates`](../interfaces/Ledger8PublicStates.md) \| [`Ledger9PublicStates`](../interfaces/Ledger9PublicStates.md)

The public states read from one block for one contract, discriminated by the ledger runtime
that wrote them. The contract state and the ledger parameters always come from the same era;
a provider refuses a block where they do not. They agree on a supported indexer, because the
node translates every contract state at the fork. Narrow on `version` before touching it.

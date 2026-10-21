[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / Ledger8PublicStates

# Interface: Ledger8PublicStates

The v8 variant of [VersionedPublicStates](../type-aliases/VersionedPublicStates.md): the contract state and the ledger parameters
as the stored bytes the v8 ledger runtime wrote, not decoded and not translated. The zswap
chain state is decoded, because both runtimes write the same `zswap-ledger-state[v5]` encoding.

## Properties

### ledgerParametersBytes

> `readonly` **ledgerParametersBytes**: `Uint8Array`

Serialized, tag-prefixed byte form of the ledger parameters.

***

### stateBytes

> `readonly` **stateBytes**: `Uint8Array`

Serialized, tag-prefixed byte form (`contract-state[v6]`).

***

### version

> `readonly` **version**: `"v8"`

***

### zswapChainState

> `readonly` **zswapChainState**: [`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

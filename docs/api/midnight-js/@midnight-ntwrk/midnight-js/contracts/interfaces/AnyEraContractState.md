[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / AnyEraContractState

# Interface: AnyEraContractState

A contract state read and decoded by whichever ledger era wrote it.

Extends ContractStatePojo, so `state` and `entryPoints` are the members protocol's own
decoders answer with, under the names they already use.

Every member is plain data. Nothing here is a live WASM handle, so the record survives a
`postMessage` to a worker and a write to storage — and `state` can be handed to the caller's OWN
Compact runtime, which a handle minted inside the framework cannot be.

## Extends

- `ContractStatePojo`

## Properties

### balance

> `readonly` **balance**: `ContractBalance`

The balances the contract holds, which are NOT part of the primary state:
the ledger keeps them beside it, so a caller reading only `state` cannot
reach them. A retained-era call that executes without them runs every
circuit against an empty balance — see RetainedEraExecution.

#### Inherited from

`ContractStatePojo.balance`

***

### entryPoints

> `readonly` **entryPoints**: readonly `ContractEntryPointPojo`[]

#### Inherited from

`ContractStatePojo.entryPoints`

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The protocol-version integer the network reported for the block that dated the read.

The raw integer, passed through unexamined. Placing it on the era timeline is
`protocolVersionToLedger`'s job, and that throws on an integer it cannot place.

***

### raw

> `readonly` **raw**: `Uint8Array`

The serialized state, byte for byte as the network served it, envelope included.

The other members are these bytes decoded, so they agree with them by construction. Reach for
these to get at what this record does not decode — the contract's balance and its maintenance
authority. NOT the block's ledger parameters: those are a sibling field on the raw record and
are not carried here, so a caller needing them reads them separately rather than substituting
`initialParameters()`.

***

### state

> `readonly` **state**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)

#### Inherited from

`ContractStatePojo.state`

***

### version

> `readonly` **version**: `"v8"` \| `"v9"`

The ledger era that wrote these bytes, read from the envelope they carry.

It can be older than the era of the block that dated the read (see [protocolVersion](#protocolversion)):
a record keeps the encoding it was written in.

[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / RawContractState

# Interface: RawContractState

A contract's on-chain state exactly as the network returned it: the
serialized bytes, still in their envelope, with nothing deserialized yet.

During the ledger-fork window the two ledger runtimes are separate WASM
instances, so bytes produced by one cannot be handed to the other. Reading
the state as bytes plus the era the network dated them to lets a caller pick
a runtime before it deserializes anything, instead of guessing and failing
deep inside a decoder.

`version` is derived from `protocolVersion` — resolved the same way the
`read`-path resolver in `@midnight-ntwrk/midnight-js-protocol` resolves it.
On every value of this type those two fields therefore agree; the derivation
is never asserted here, because `types` stays declarations-only. Providers
and their mocks are responsible for setting `version` at exactly one
construction point, from `protocolVersion`, and never independently.

What is not established at this layer is that `version` agrees with the
envelope inside `raw`. Nothing here compares the two, so `version` is the
network's dating of the record, not a guarantee about the bytes.

## Properties

### ledgerParameters?

> `readonly` `optional` **ledgerParameters?**: `Uint8Array`\<`ArrayBufferLike`\>

The ledger parameters the chain held at the block that dated this state, exactly as served —
no envelope reading, no decode.

WHY THEY TRAVEL WITH THE STATE. They are needed to build a transaction against this state, and
they must come from the SAME block: they are dynamic (prices adjust per block) and they are
era-tagged (`ledger-parameters[v5]` before the fork, `[v8]` after it). Reading them separately
would let the two answers come from different blocks, and a caller that substitutes the
ledger's own `initialParameters()` is using a cost model the chain does not use — which is
wrong on any chain that has been running, not only across a fork.

Bytes rather than a decoded object, for the same reason [RawContractState.raw](#raw) is: only
the era that wrote them can read them, and this record is deliberately era-agnostic.

Optional because a provider that cannot serve them is still a usable provider; a consumer that
needs them has to say what it does without them.

***

### protocolVersion

> `readonly` **protocolVersion**: `number`

The raw protocol-version integer the network reported for the state.

***

### raw

> `readonly` **raw**: `Uint8Array`

The serialized contract state, byte for byte as the network returned it,
including the envelope that precedes the state body. Not deserialized,
and not narrowed by era — narrow on [version](#version) first, then hand
these bytes to that era's deserializer.

***

### version

> `readonly` **version**: `"v9"` \| `"v8"`

The ledger era this record is dated to, derived from
[protocolVersion](#protocolversion) alone.

This layer does not check that the era agrees with the envelope [raw](#raw)
actually carries, so this is a statement about the record's
`protocolVersion`, not a verified statement about the bytes. A caller that
cannot tolerate the two disagreeing must inspect the envelope itself.

[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / RawContractState

# Interface: RawContractState

A contract's on-chain state exactly as the network returned it: the
serialized bytes, still in their envelope, with nothing deserialized yet.

`version` is derived from `protocolVersion`. It is the network's DATING of the
record, not a guarantee about the bytes: nothing here compares it against the
envelope inside `raw`.

Implementing this? Set `version` at exactly ONE construction point, from
`protocolVersion`, never independently.

## See

[VersionTaggedPayloads](../../documents/VersionTaggedPayloads.md) for why the state crosses as bytes, and for
the three things the tag does not establish.

## Properties

### ledgerParameters?

> `readonly` `optional` **ledgerParameters?**: `Uint8Array`\<`ArrayBufferLike`\>

The ledger parameters the chain held at the block that dated this state, exactly as served —
no envelope reading, no decode.

They must come from the SAME block as the state: they are dynamic and era-tagged. DO NOT
substitute the ledger's own `initialParameters()` — that is a cost model the chain does not
use.

Bytes rather than a decoded object, for the same reason [RawContractState.raw](#raw) is.

Optional because a provider that cannot serve them is still a usable provider; a consumer that
needs them has to say what it does without them.

#### See

[VersionTaggedPayloads](../../documents/VersionTaggedPayloads.md) for why they travel with the state rather than separately.

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

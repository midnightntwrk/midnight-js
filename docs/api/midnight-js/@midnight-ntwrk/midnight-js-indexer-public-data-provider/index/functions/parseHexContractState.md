[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../../README.md) / [index](../README.md) / parseHexContractState

# Function: parseHexContractState()

> **parseHexContractState**(`hexState`, `protocolVersion`, `options?`): [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

Deserialize a contract state the indexer served, after establishing which
ledger runtime wrote it — and only if that runtime is one this path can
decode.

The version tag is the authority on the bytes, and the version the indexer
reported for the dating block is an upper bound on it. That asymmetry is the
whole rule, and it follows from how the two signals are obtained:

- The version tag comes off the bytes themselves. It is attacker-controlled and
  proves nothing about the network, but it is the one thing the deserializer
  also reads: a mismatched version tag is rejected on the header tag before the
  body, so it cannot produce a wrong answer, only a failure.
- The reported version dates the *read*, not the bytes, so a state can
  legitimately be older than the block that dates it — a record of a
  pre-fork contract action keeps its pre-fork version tag when it is read under
  a post-fork block.

So an older version tag under a newer block is normal and decided on the
version tag alone. The reverse — bytes written by a runtime the dating block
had not forked to yet — cannot happen while both signals describe the same
block, and is the one direction reported as
[IndexerDataError.eraDisagreement](../classes/IndexerDataError.md#eradisagreement). Where they need not describe the
same block, the caller says so and the comparison is dropped instead of
being reported as a fault — see [UpperBoundCheck](../type-aliases/UpperBoundCheck.md).

Nothing reaches a deserializer until the era is settled.

## Parameters

### hexState

`string`

The hex-encoded serialized contract state, as the indexer
                serves it.

### protocolVersion

`number`

The protocol-version integer of the block that dates
                       the read. An integer this client cannot resolve
                       skips the upper-bound check and nothing else.

### options?

`upperBound` states whether `protocolVersion` certainly
               describes the same block as the bytes, and so whether it may
               bound the version tag. Defaults to `'check'`, so a call site
               has to opt out of the check deliberately rather than lose it
               by omission. See [UpperBoundCheck](../type-aliases/UpperBoundCheck.md).

#### upperBound?

[`UpperBoundCheck`](../type-aliases/UpperBoundCheck.md)

## Returns

[`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

## Throws

When the state is not hex-encoded, when its
  version tag is newer than the block that dates it and that bound is checked,
  or when its era is not decodable here.

## Throws

When the payload carries no supported contract-state
  version tag.

## Throws

When the version tag is decodable but the state
  body behind it is not.

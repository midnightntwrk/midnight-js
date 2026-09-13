[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-indexer-public-data-provider](../README.md) / EnvelopeUpperBound

# Type Alias: EnvelopeUpperBound

> **EnvelopeUpperBound** = `"enforced"` \| `"withheld"`

Whether the `protocolVersion` handed to [parseHexContractState](../functions/parseHexContractState.md) may be
trusted as an upper bound on the state's envelope.

`'enforced'` is the default and the case to reach for: the version is known
to describe the same block as the bytes, so bytes from a newer runtime are an
indexer fault. A call site earns it either by reading the version out of the
same resolution that produced the state — a `transaction` or `block` subtree
carrying the state itself — or by pinning both Query-root fields to one fixed
block offset.

`'withheld'` is for the one shape that earns neither: `block` and `contract`
asked for as Query-root siblings on an *unpinned* read. The indexer resolves
those concurrently, from independent reads, and with no offset both follow
the chain tip — so a block indexed between the two puts them on either side
of a fork, giving a newer envelope under an older block with nothing wrong
anywhere. Only the comparison is dropped; the envelope still decides
decodability, which is what actually keeps a wrong-era payload away from the
decoder.

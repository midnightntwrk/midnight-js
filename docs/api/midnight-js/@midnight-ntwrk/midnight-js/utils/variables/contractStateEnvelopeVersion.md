[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / contractStateEnvelopeVersion

# Variable: contractStateEnvelopeVersion

> `const` **contractStateEnvelopeVersion**: (`raw`) => [`LedgerVersion`](../../type-aliases/LedgerVersion.md)

Reads which ledger runtime wrote a serialized contract state, from the envelope tag in front of
the state body — without deserializing the body.

The tag is attacker-controlled input and is never the authority on the body; the node remains the
sole authority on what the bytes decode to. What this check buys is a cheap, early rejection of
anything that is not a contract state from a supported runtime, before those bytes reach a
decoder — and, for a caller that holds two runtimes, the answer to which one to hand them to.

Supported public API, deliberately: a caller reading raw contract state from an indexer needs to
know which era's decoder to hand the bytes to before it hands them over.

## Parameters

### raw

`Uint8Array`

The serialized contract-state envelope, as the network returned it.

## Returns

[`LedgerVersion`](../../type-aliases/LedgerVersion.md)

The ledger era whose runtime wrote `raw`.

## Throws

TagParseError when there is no well-formed `namespace:version:` tag prefix in the first
64 bytes, or when the tag is not one of the supported contract-state envelopes.

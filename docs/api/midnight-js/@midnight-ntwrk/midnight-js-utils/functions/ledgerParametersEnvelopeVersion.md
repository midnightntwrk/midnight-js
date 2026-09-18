[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / ledgerParametersEnvelopeVersion

# Function: ledgerParametersEnvelopeVersion()

> **ledgerParametersEnvelopeVersion**(`raw`): `"v8"` \| `"v9"`

Reads which ledger runtime wrote a serialized set of ledger parameters, from the envelope tag in
front of the body — without deserializing the body.

The sibling of [contractStateEnvelopeVersion](contractStateEnvelopeVersion.md), and it exists for the same reason: the
indexer serves ledger parameters PER BLOCK, they are era-tagged, and each era's deserializer
refuses the other era's bytes on the header tag. A reader that decodes them with a fixed era's
runtime therefore works on one side of a fork and fails on the other — with a raw deserialization
failure that names neither the era nor the field.

The tag is network-supplied input and is never the authority on the body; the node remains the
sole authority on what the bytes decode to. What this check buys is a cheap, early rejection of
anything that is not a parameter set from a supported runtime, before those bytes reach a
decoder — and, for a caller that holds two runtimes, the answer to which one to hand them to.

Supported public API, deliberately: a caller refused a pre-fork block's parameters by an era-fixed
read path has to decode them itself, and needs this to pick the runtime to decode them with.

## Parameters

### raw

`Uint8Array`

The serialized ledger-parameters envelope, as the network returned it.

## Returns

`"v8"` \| `"v9"`

The ledger era whose runtime wrote `raw`.

## Throws

TagParseError when there is no well-formed `namespace:version:` tag prefix in the first
64 bytes, or when the tag is not one of the supported ledger-parameters envelopes.

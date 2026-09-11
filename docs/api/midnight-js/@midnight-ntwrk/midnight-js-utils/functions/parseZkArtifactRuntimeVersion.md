[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / parseZkArtifactRuntimeVersion

# Function: parseZkArtifactRuntimeVersion()

> **parseZkArtifactRuntimeVersion**(`rawJson`): `string`

Reads the `runtime-version` a `compactc` `contract-info.json` declares.

Only the runtime version is returned, because it is the only member callers act on: it names the
`compact-runtime` the artifact set was compiled against, which is what places the artifact on the
ledger-era timeline. Every other member of the file is the contract's own description and belongs
to the toolchain, not to this framework.

Fail-closed throughout: a missing, empty or non-string `runtime-version` throws rather than
answering `undefined`, because an absent answer here is indistinguishable from an artifact set
that declares nothing, and a caller cannot act on either.

## Parameters

### rawJson

`string`

The file's bytes, decoded as UTF-8 text.

## Returns

`string`

The declared runtime version, verbatim.

## Throws

ZkArtifactContractInfoError if the text is not a JSON object, or declares no usable
`runtime-version`.
